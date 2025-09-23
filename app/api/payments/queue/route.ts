import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function GET() {
  // Fetch only supplier-approved offers
  const result = await executeQuery(
    `SELECT epo.id, epo.supplier_user_id AS supplier, epo.buyer_id AS buyer, epo.invoice_number, epo.amount, epo.offered_amount, epo.fee_percent, epo.fee_amount, epo.due_date, epo.status, epo.created_at, epo.accepted_at, u.bank_details, epo.vendor_number
     FROM early_payment_offers epo
     JOIN users u ON epo.supplier_user_id = u.id
     WHERE epo.status = 'accepted'
     ORDER BY epo.accepted_at DESC`
  )
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result.data)
}
