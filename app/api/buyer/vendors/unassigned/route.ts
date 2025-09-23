import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

// Returns vendor_numbers seen in AP rows for this buyer that are not linked to any supplier via vendor_consents
export async function GET(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    // Distinct vendor_numbers from ap_batch_rows for this buyer that do not have a consent with a supplier_user_id
    let sql = `
      SELECT DISTINCT r.vendor_number
      FROM ap_batch_rows r
      WHERE r.buyer_id = ?
        AND r.vendor_number IS NOT NULL AND r.vendor_number <> ''
        AND NOT EXISTS (
          SELECT 1 FROM vendor_consents vc
          WHERE vc.buyer_id = r.buyer_id AND vc.vendor_number = r.vendor_number AND vc.supplier_user_id IS NOT NULL
        )
    `
    const params: any[] = [user.id]
    if (q) {
      sql += ` AND r.vendor_number LIKE ?`
      params.push(`%${q}%`)
    }
    sql += ` ORDER BY r.vendor_number ASC LIMIT ?`
    params.push(String(limit))

    const res = await executeQuery(sql, params)
    if (!res.success) return NextResponse.json({ error: res.error || 'Failed to load unassigned vendors' }, { status: 500 })

    const vendors = (res.data as any[]).map(r => r.vendor_number)
    return NextResponse.json({ vendors })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load unassigned vendors' }, { status: 500 })
  }
}
