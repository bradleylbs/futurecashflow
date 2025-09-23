import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import path from "path"
import fs from "fs/promises"
import { verifyJWT } from "@/lib/auth"

// GET /api/kyc/documents/preview?documentId=...
// Validates that the requesting user owns the KYC record for the document, then streams file bytes.
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

    // Fetch document and verify ownership
    const docQuery = await executeQuery(
      `SELECT d.id, d.file_path, d.mime_type, d.kyc_id FROM documents d
       JOIN kyc_records k ON d.kyc_id = k.id
       WHERE d.id = ? AND k.user_id = ?
       LIMIT 1`,
      [documentId, user.id],
    )

    if (!docQuery.success || (docQuery.data ?? []).length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const doc = (docQuery.data as any[])[0]
  const privateRoot = path.join(process.cwd(), ".private_uploads")
  // file_path is stored as "documents/<kycId>/<filename>"
  const safeRel = String(doc.file_path).replace(/(?:^\/+|\.\.+)/g, "")
  const absPath = path.join(privateRoot, safeRel)

    try {
      const stat = await fs.stat(absPath)
      if (!stat.isFile()) throw new Error("Not a file")
    } catch {
      return NextResponse.json({ error: "File missing" }, { status: 404 })
    }

  const file = await fs.readFile(absPath)
  return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": doc.mime_type || "application/octet-stream",
        "Cache-Control": "private, max-age=0, no-store",
        "Content-Disposition": `inline; filename="${path.basename(absPath)}"`,
      },
    })
  } catch (error) {
    console.error("Document preview error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
