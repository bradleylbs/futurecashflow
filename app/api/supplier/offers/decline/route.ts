import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

const MIN_HOURS_TO_DUE = 48

export async function POST(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role.toLowerCase() !== "supplier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const invoice_row_id = body?.invoice_row_id
    if (!invoice_row_id) {
      return NextResponse.json({ error: "invoice_row_id is required" }, { status: 400 })
    }

    // Validate it is still eligible (not required but ensures correctness)
    const q = `
      SELECT 
        r.id AS invoice_row_id,
        r.invoice_number,
        r.vendor_number,
        r.amount,
        r.due_date,
        u.id AS buyer_id
      FROM ap_batch_rows r
      JOIN users u ON u.id = r.buyer_id
      WHERE r.id = ? AND r.status = 'accepted'
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
      LIMIT 1
    `
    const res = await executeQuery(q, [invoice_row_id, user.id, String(MIN_HOURS_TO_DUE), user.id])
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Could not validate decline" }, { status: 500 })
    }
    const row = (res.data || [])[0]
    if (!row) {
      return NextResponse.json({ error: "Offer not available for this invoice" }, { status: 400 })
    }

    const insert = `
      INSERT INTO early_payment_offers (
        invoice_row_id, buyer_id, supplier_user_id, vendor_number, invoice_number,
        amount, due_date, fee_percent, fee_amount, offered_amount, status, declined_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'declined', NOW())
      ON DUPLICATE KEY UPDATE status='declined', declined_at=NOW(), updated_at=NOW()
    `
    const ins = await executeQuery(insert, [
      row.invoice_row_id,
      row.buyer_id,
      user.id,
      row.vendor_number,
      row.invoice_number,
      row.amount,
      row.due_date,
    ])
    if (!ins.success) {
      return NextResponse.json({ error: ins.error || "Failed to decline offer" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("Decline offer error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
