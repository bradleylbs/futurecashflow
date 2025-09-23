import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function POST(req: Request) {
  const { id } = await req.json()
  // Update payment status to 'approved' in DB
  const result = await executeQuery(
    `UPDATE early_payment_offers SET status = 'approved', updated_at = NOW() WHERE id = ?`,
    [id]
  )
  // Log audit trail (simple example)
  await executeQuery(
    `INSERT INTO audit_log (action, entity_id, entity_type, details, created_at) VALUES (?, ?, ?, ?, NOW())`,
    ["approve_payment", id, "early_payment_offer", "Payment offer approved by admin"]
  )
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true, id, status: "approved" })
}
