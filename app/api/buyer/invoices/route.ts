import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { executeQuery } from '@/lib/database'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role.toLowerCase() !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    // Deduplicate by (vendor_number, invoice_number): return the most recent accepted row
    const q = `
      SELECT 
        r.id,
        r.invoice_number,
        r.vendor_number,
        r.amount,
        r.due_date,
        r.status,
        r.created_at,
        b.created_at as batch_created_at,
        /* Scalar subqueries to avoid multiplicative joins */
        (
          SELECT vc.supplier_user_id
          FROM vendor_consents vc
          WHERE vc.buyer_id = r.buyer_id
            AND vc.vendor_number = r.vendor_number
            AND vc.consent_status = 'consented'
          ORDER BY vc.updated_at DESC, vc.consented_at DESC
          LIMIT 1
        ) AS supplier_user_id,
        (
          SELECT us.email FROM users us
          WHERE us.id = (
            SELECT vc2.supplier_user_id
            FROM vendor_consents vc2
            WHERE vc2.buyer_id = r.buyer_id
              AND vc2.vendor_number = r.vendor_number
              AND vc2.consent_status = 'consented'
            ORDER BY vc2.updated_at DESC, vc2.consented_at DESC
            LIMIT 1
          )
          LIMIT 1
        ) AS supplier_email
      FROM ap_batch_rows r
      JOIN ap_batches b ON b.id = r.batch_id
      WHERE r.buyer_id = ? AND r.status = 'accepted'
        AND NOT EXISTS (
          SELECT 1 FROM ap_batch_rows r2
          WHERE r2.buyer_id = r.buyer_id
            AND r2.vendor_number = r.vendor_number
            AND r2.invoice_number = r.invoice_number
            AND r2.status = 'accepted'
            AND (
              r2.created_at > r.created_at OR
              (r2.created_at = r.created_at AND r2.id > r.id)
            )
        )
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    const res = await executeQuery(q, [user.id, String(limit), String(offset)])
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to load invoices' }, { status: 500 })
    }
    return NextResponse.json({ invoices: res.data || [] })
  } catch (e: any) {
    console.error('Buyer invoices error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
