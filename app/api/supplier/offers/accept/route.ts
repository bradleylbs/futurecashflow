// app/api/supplier/offers/accept/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

const DEFAULT_FEE_PERCENT = 5 // 5%
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

    // Validate eligibility and compute current offer values
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
      return NextResponse.json({ error: res.error || "Could not validate offer" }, { status: 500 })
    }
    const row = (res.data || [])[0]
    if (!row) {
      return NextResponse.json({ error: "Offer not available for this invoice" }, { status: 400 })
    }

    const fee_percent = DEFAULT_FEE_PERCENT
    const fee_amount = Number((Number(row.amount) * (fee_percent / 100)).toFixed(2))
    const offered_amount = Number((Number(row.amount) - fee_amount).toFixed(2))

    // Upsert into early_payment_offers as accepted
    const insert = `
      INSERT INTO early_payment_offers (
        invoice_row_id, buyer_id, supplier_user_id, vendor_number, invoice_number,
        amount, due_date, fee_percent, fee_amount, offered_amount, status, accepted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', NOW())
      ON DUPLICATE KEY UPDATE 
        status='accepted', 
        fee_percent=VALUES(fee_percent), 
        fee_amount=VALUES(fee_amount), 
        offered_amount=VALUES(offered_amount), 
        accepted_at=NOW(), 
        updated_at=NOW()
    `
    const ins = await executeQuery(insert, [
      row.invoice_row_id,
      row.buyer_id,
      user.id,
      row.vendor_number,
      row.invoice_number,
      row.amount,
      row.due_date,
      String(fee_percent),
      String(fee_amount),
      String(offered_amount),
    ])
    
    if (!ins.success) {
      return NextResponse.json({ error: ins.error || "Failed to accept offer" }, { status: 500 })
    }

    // Get the early_payment_offer ID that was created/updated
    let earlyPaymentOfferId: string | null = null
    
    if (ins.data && typeof ins.data === 'object' && 'insertId' in ins.data) {
      earlyPaymentOfferId = String(ins.data.insertId)
    } else {
      // If no insertId, try to get the existing offer ID
      const offerQuery = await executeQuery(
        `SELECT id FROM early_payment_offers WHERE invoice_row_id = ? AND supplier_user_id = ?`,
        [row.invoice_row_id, user.id]
      )
      if (offerQuery.success && Array.isArray(offerQuery.data) && offerQuery.data.length > 0) {
        earlyPaymentOfferId = offerQuery.data[0].id
      }
    }

    // ALWAYS create or update payment record with the early_payment_offer_id
    const paymentUpsert = `
      INSERT INTO payments (
        buyer_id, supplier_user_id, invoice_row_id, amount, 
        payment_date, status, early_payment_offer_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, 'pending', ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        amount = VALUES(amount),
        early_payment_offer_id = VALUES(early_payment_offer_id),
        status = 'pending',
        updated_at = NOW()
    `

    const paymentResult = await executeQuery(paymentUpsert, [
      row.buyer_id, 
      user.id, 
      row.invoice_row_id, 
      String(offered_amount),
      earlyPaymentOfferId
    ])

    let paymentRecord = null
    if (paymentResult.success) {
      // Fetch the newly created/updated payment record
      const paymentFetch = await executeQuery(
        `SELECT id, buyer_id, supplier_user_id, invoice_row_id, amount, payment_date, 
                payment_reference, status, early_payment_offer_id, created_at, updated_at 
         FROM payments 
         WHERE invoice_row_id = ? AND supplier_user_id = ? 
         ORDER BY created_at DESC LIMIT 1`,
        [row.invoice_row_id, user.id]
      )
      if (paymentFetch.success && Array.isArray(paymentFetch.data) && paymentFetch.data.length > 0) {
        paymentRecord = paymentFetch.data[0]
      }
    } else {
      console.error("Failed to create payment record:", paymentResult.error)
    }

    return NextResponse.json({ 
      ok: true, 
      fee_percent, 
      fee_amount, 
      offered_amount, 
      payment: paymentRecord,
      payment_id: paymentRecord?.id,
      early_payment_offer_id: earlyPaymentOfferId
    })
  } catch (e: any) {
    console.error("Accept offer error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}