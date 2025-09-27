import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    if (!userId || userRole !== "supplier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Total invoices
    const invoicesRes = await executeQuery(
      `SELECT COUNT(*) as total FROM invoices WHERE supplier_id = ?`, [userId]
    )
  const totalInvoices = invoicesRes.success && invoicesRes.data && invoicesRes.data.length > 0 ? invoicesRes.data[0].total : 0

    // Payments received
    const paymentsRes = await executeQuery(
      `SELECT COUNT(*) as total, SUM(amount) as totalAmount FROM payments WHERE supplier_id = ?`, [userId]
    )
  const totalPayments = paymentsRes.success && paymentsRes.data && paymentsRes.data.length > 0 ? paymentsRes.data[0].total : 0
  const totalPaid = paymentsRes.success && paymentsRes.data && paymentsRes.data.length > 0 ? paymentsRes.data[0].totalAmount || 0 : 0

    // Early payment offers
    const offersRes = await executeQuery(
      `SELECT COUNT(*) as total FROM early_payment_offers WHERE supplier_id = ?`, [userId]
    )
  const totalOffers = offersRes.success && offersRes.data && offersRes.data.length > 0 ? offersRes.data[0].total : 0

    // Support tickets
    const ticketsRes = await executeQuery(
      `SELECT COUNT(*) as total FROM support_tickets WHERE supplier_id = ?`, [userId]
    )
  const totalTickets = ticketsRes.success && ticketsRes.data && ticketsRes.data.length > 0 ? ticketsRes.data[0].total : 0

    // Onboarding progress (from dashboard_access)
    const onboardingRes = await executeQuery(
      `SELECT access_level FROM dashboard_access WHERE user_id = ?`, [userId]
    )
  const onboardingLevel = onboardingRes.success && onboardingRes.data && onboardingRes.data.length > 0 ? onboardingRes.data[0].access_level : "pre_kyc"

    return NextResponse.json({
      totalInvoices,
      totalPayments,
      totalPaid,
      totalOffers,
      totalTickets,
      onboardingLevel
    })
  } catch (error) {
    console.error("Supplier analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
