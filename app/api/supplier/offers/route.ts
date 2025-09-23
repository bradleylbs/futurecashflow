import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

// Default offer configuration — can be moved to buyer-level config later
const DEFAULT_FEE_PERCENT = 5 // 5%
const MIN_HOURS_TO_DUE = 48

export async function GET(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role.toLowerCase() !== "supplier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0)

    // Eligible: accepted invoices, consented to this supplier, due date >= 48h away,
    // and not already accepted/declined in early_payment_offers
    const q = `
      SELECT 
        r.id AS invoice_row_id,
        r.invoice_number,
        r.vendor_number,
        r.amount,
        r.due_date,
        r.created_at,
        u.id AS buyer_id,
        u.email AS buyer_email,
        b.created_at AS batch_created_at
      FROM ap_batch_rows r
      JOIN ap_batches b ON b.id = r.batch_id
      JOIN users u ON u.id = r.buyer_id
      WHERE r.status = 'accepted'
        AND EXISTS (
          SELECT 1 FROM vendor_consents vc
          WHERE vc.buyer_id = r.buyer_id
            AND vc.vendor_number = r.vendor_number
            AND vc.supplier_user_id = ?
            AND vc.consent_status = 'consented'
        )
        AND TIMESTAMPDIFF(HOUR, NOW(), r.due_date) >= ?
        AND NOT EXISTS (
          SELECT 1 FROM early_payment_offers epo
          WHERE epo.invoice_row_id = r.id
            AND epo.supplier_user_id = ?
            AND epo.status IN ('accepted','declined','expired')
        )
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
      ORDER BY r.due_date ASC
      LIMIT ? OFFSET ?
    `
    const res = await executeQuery(q, [user.id, String(MIN_HOURS_TO_DUE), user.id, String(limit), String(offset)])
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to load offers" }, { status: 500 })
    }

    const offers = (res.data || []).map((row: any) => {
      const fee_percent = DEFAULT_FEE_PERCENT
      const fee_amount = Number((Number(row.amount) * (fee_percent / 100)).toFixed(2))
      const offered_amount = Number((Number(row.amount) - fee_amount).toFixed(2))
      return { ...row, fee_percent, fee_amount, offered_amount }
    })

    return NextResponse.json({ offers })
  } catch (e: any) {
    console.error("Supplier offers error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
