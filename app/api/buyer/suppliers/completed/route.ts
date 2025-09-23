import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

// Returns suppliers considered "completed" for this buyer (active link or completed invitation)
export async function GET(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)

    // Union of active buyer-supplier links and completed invitations with supplier_user_id
    let sql = `
      SELECT DISTINCT s.id, s.email FROM (
        SELECT u.id, u.email
        FROM buyer_supplier_links bsl
        JOIN users u ON u.id = bsl.supplier_user_id
        WHERE bsl.buyer_id = ? AND bsl.status = 'active'
        UNION
        SELECT u.id, u.email
        FROM supplier_invitations si
        JOIN users u ON u.id = si.supplier_user_id
        WHERE si.buyer_id = ? AND si.status = 'completed'
      ) s
    `
    const params: any[] = [user.id, user.id]
    if (q) {
      sql += ` WHERE s.email LIKE ?`
      params.push(`%${q}%`)
    }
    sql += ` ORDER BY s.email ASC LIMIT ?`
    params.push(String(limit))

    const res = await executeQuery(sql, params)
    if (!res.success) return NextResponse.json({ error: res.error || 'Failed to load suppliers' }, { status: 500 })

    return NextResponse.json({ suppliers: res.data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load suppliers' }, { status: 500 })
  }
}
