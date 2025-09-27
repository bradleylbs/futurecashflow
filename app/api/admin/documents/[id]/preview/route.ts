import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"
import path from "path"
import fs from "fs/promises"

export const runtime = 'nodejs'

const ADMIN_ROLES = new Set(["admin", "fm_admin", "fa_admin"]) as Set<string>

async function getUserRole(req: NextRequest): Promise<string | null> {
  const hdr = (req.headers.get("x-user-role") || "").toLowerCase()
  if (hdr) return hdr
  const user = await verifyJWT(req as unknown as Request)
  return (user?.role || "").toLowerCase() || null
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const role = await getUserRole(req)
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

  // 'id' is already destructured above
    const { searchParams } = new URL(req.url)
    const forceDownload = searchParams.get('download') === '1'

    const q = await executeQuery(
      `SELECT file_path, mime_type FROM documents WHERE id = ? AND replaced_by IS NULL LIMIT 1`,
      [id]
    )
    if (!q.success || (q.data as any[]).length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const doc = (q.data as any[])[0] as { file_path: string; mime_type?: string }

    const privateRoot = path.join(process.cwd(), ".private_uploads")
    const safeRel = String(doc.file_path || "").replace(/(?:^\/+|\.+\/)/g, "").replace(/\.\./g, "")
    const absPath = path.join(privateRoot, safeRel)

    try {
      const stat = await fs.stat(absPath)
      if (!stat.isFile()) throw new Error('Not a file')
    } catch {
      return NextResponse.json({ error: 'File missing' }, { status: 404 })
    }

    const buf = await fs.readFile(absPath)
    const headers: Record<string, string> = {
      "Content-Type": doc.mime_type || "application/octet-stream",
      "Cache-Control": "private, max-age=0, no-store",
      "Content-Disposition": `${forceDownload ? 'attachment' : 'inline'}; filename="${path.basename(absPath)}"`,
    }
    return new NextResponse(new Uint8Array(buf), { status: 200, headers })
  } catch (e) {
    console.error('Admin document preview error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
