import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export const runtime = 'nodejs'

const ADMIN_ROLES = new Set(["admin", "fm_admin", "fa_admin"]) as Set<string>

async function getUserRole(req: NextRequest): Promise<string | null> {
  let role = (req.headers.get("x-user-role") || "").toLowerCase()
  if (role) return role
  const user = await verifyJWT(req as unknown as Request)
  return (user?.role || "").toLowerCase() || null
}

async function hasPendingDocs(kycId: string): Promise<boolean> {
  const sql = `
    SELECT 
      SUM(CASE WHEN d.status IN ('pending','under_review') THEN 1 ELSE 0 END) AS pending_docs
    FROM documents d
    WHERE d.kyc_id = ? AND d.replaced_by IS NULL
  `
  const res = await executeQuery(sql, [kycId])
  if (!res.success) return true
  const pending = Number(((res.data as any[])[0]?.pending_docs) || 0)
  return pending > 0
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = await getUserRole(req)
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: rawId } = await params
    const id = String(rawId || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Invalid application id' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({} as any))
    const decision = String(body?.decision || '').toLowerCase()
    const notes: string | null = body?.notes ? String(body.notes).slice(0, 2000) : null

    if (!['approve','reject'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    if (decision === 'reject' && !notes) {
      return NextResponse.json({ error: 'Rejection requires notes' }, { status: 400 })
    }

    // Ensure the application is ready for decision
  const kycRes = await executeQuery(`SELECT status FROM kyc_records WHERE id = ? LIMIT 1`, [id])
    if (!kycRes.success || (kycRes.data as any[]).length === 0) {
      return NextResponse.json({ error: 'KYC record not found' }, { status: 404 })
    }
    const currentStatus = (kycRes.data as any[])[0]?.status as string
    if (currentStatus !== 'ready_for_decision') {
      return NextResponse.json({ error: 'KYC application is not ready for decision' }, { status: 400 })
    }

    if (decision === 'approve') {
      const pending = await hasPendingDocs(id)
      if (pending) {
        return NextResponse.json({ error: 'Application has pending documents' }, { status: 409 })
      }
    }

    const status = decision === 'approve' ? 'approved' : 'rejected'
    const updateSql = `
      UPDATE kyc_records
      SET status = ?, decided_at = NOW(), decision_notes = ?, reviewed_at = COALESCE(reviewed_at, NOW())
      WHERE id = ?
    `
  const upd = await executeQuery(updateSql, [status, notes, id])
    if (!upd.success) {
      return NextResponse.json({ error: 'Failed to update application', details: (upd as any).error }, { status: 500 })
    }

    return NextResponse.json({ success: true, id, status })
  } catch (e) {
    console.error('Decision API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
