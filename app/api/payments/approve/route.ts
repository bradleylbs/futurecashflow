// app/api/payments/approve/route.ts
import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { paymentId, paymentReference } = await request.json()
    console.log("Approve payment called with paymentId:", paymentId)
    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 })
    }

    // Approve payment: set status to 'paid', set payment_date and optionally payment_reference
    const result = await executeQuery(
      `UPDATE payments SET status = 'paid', payment_date = CURDATE(), payment_reference = ? WHERE TRIM(id) = ? AND status = 'pending'`,
      [paymentReference || null, paymentId.trim()]
    );
    
    const affectedRows = (result.data && typeof result.data === 'object' && 'affectedRows' in result.data)
      ? result.data.affectedRows
      : Array.isArray(result.data) && result.data[0] && result.data[0].affectedRows
        ? result.data[0].affectedRows
        : 0;
        
    console.log("Approve payment affectedRows:", affectedRows)

    if (result.success && affectedRows > 0) {
      return NextResponse.json({ success: true, paymentId })
    } else {
      return NextResponse.json({ error: "Payment not found or already processed" }, { status: 404 })
    }
  } catch (error) {
    console.error("Approve payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}