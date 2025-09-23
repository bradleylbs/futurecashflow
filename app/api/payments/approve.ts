import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    
    if (!id) {
      return NextResponse.json({ error: "Payment offer ID is required" }, { status: 400 })
    }

    // Get current admin user from session/auth context
    // Uses verifyJWT from lib/auth (adjust import if needed)
    const { verifyJWT } = await import("@/lib/auth")
    const currentUser = await verifyJWT(req)
    if (!currentUser || !["admin", "fm_admin"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    const adminUserId = currentUser.id

    // First, verify the payment offer exists and is in 'accepted' status
    const checkResult = await executeQuery(
      `SELECT id, status, supplier_user_id, buyer_id FROM early_payment_offers WHERE id = ?`,
      [id]
    )

    if (
      !checkResult.success ||
      !checkResult.data ||
      checkResult.data.length === 0
    ) {
      return NextResponse.json({ error: "Payment offer not found" }, { status: 404 })
    }

    const offer = checkResult.data[0]
    if (offer.status !== 'accepted') {
      return NextResponse.json({ 
        error: `Cannot approve payment with status: ${offer.status}. Only 'accepted' payments can be approved.` 
      }, { status: 400 })
    }

    // Update payment status to 'approved' (not 'accepted' as in original)
    const result = await executeQuery(
      `UPDATE early_payment_offers SET status = 'approved', updated_at = NOW() WHERE id = ? AND status = 'accepted'`,
      [id]
    )

    if (!result.success) {
      console.error("Failed to update payment status:", result.error)
      return NextResponse.json({ error: "Failed to approve payment" }, { status: 500 })
    }

    // Check affectedRows on result if present
    const affectedRows = (result as any).affectedRows;
    if (typeof affectedRows === "number" && affectedRows === 0) {
      return NextResponse.json({ error: "Payment offer not found or already processed" }, { status: 404 })
    }

    // Log audit trail using correct audit_events table (not audit_log)
    const auditResult = await executeQuery(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        adminUserId,
        "approve_payment", 
        "early_payment_offer", 
        id, 
        JSON.stringify({
          details: "Payment offer approved by admin",
          supplier_user_id: offer.supplier_user_id,
          buyer_id: offer.buyer_id,
          previous_status: "accepted",
          new_status: "approved"
        })
      ]
    )

    if (!auditResult.success) {
      console.error("Failed to create audit log:", auditResult.error)
      // Don't fail the request if audit logging fails, but log the error
    }

    return NextResponse.json({ 
      success: true, 
      id, 
      status: "approved", // Return correct status
      message: "Payment offer approved successfully"
    })

  } catch (error) {
    console.error("Error approving payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}