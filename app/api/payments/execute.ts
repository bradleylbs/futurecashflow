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

    // First, verify the payment offer exists and is in 'approved' status, and get banking details
    const checkResult = await executeQuery(
      `SELECT epo.id, epo.status, epo.supplier_user_id, epo.buyer_id, epo.amount, epo.offered_amount,
              epo.invoice_number, epo.vendor_number,
              bd.bank_name, bd.account_number, bd.routing_number, bd.account_holder_name, bd.status as banking_status
       FROM early_payment_offers epo
       JOIN users u ON epo.supplier_user_id = u.id
       LEFT JOIN banking_details bd ON u.id = bd.user_id AND bd.status = 'verified'
       WHERE epo.id = ?`,
      [id]
    )

    if (!checkResult.success || !checkResult.data || checkResult.data.length === 0) {
      return NextResponse.json({ error: "Payment offer not found" }, { status: 404 })
    }

    const offer = checkResult.data[0]
    
    if (offer.status !== 'approved') {
      return NextResponse.json({ 
        error: `Cannot execute payment with status: ${offer.status}. Only 'approved' payments can be executed.` 
      }, { status: 400 })
    }

    // Verify banking details are available and verified
    if (!offer.bank_name || !offer.account_number || offer.banking_status !== 'verified') {
      return NextResponse.json({ 
        error: "Verified banking details required for payment execution" 
      }, { status: 400 })
    }

    // Update payment status to 'executed' in DB
    const result = await executeQuery(
      `UPDATE early_payment_offers SET status = 'executed', updated_at = NOW() WHERE id = ? AND status = 'approved'`,
      [id]
    )

    if (!result.success) {
      console.error("Failed to update payment status:", result.error)
      return NextResponse.json({ error: "Failed to execute payment" }, { status: 500 })
    }

    // Check if update affected any rows (assuming result.data contains affectedRows)
    let affectedRows = 0;
    if (Array.isArray(result.data)) {
      affectedRows = result.data.length;
    } else if (result.data && typeof result.data === "object" && "affectedRows" in result.data) {
      affectedRows = (result.data as { affectedRows: number }).affectedRows;
    }
    if (affectedRows === 0) {
      return NextResponse.json({ error: "Payment offer not found or already processed" }, { status: 404 })
    }

    // Generate payment instructions (stub)
    // TODO: Integrate with bank/payment API
    const paymentReference = `EPO-${id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    const paymentInstructions = {
      reference: paymentReference,
      amount: offer.offered_amount,
      currency: "USD",
      recipient: {
        name: offer.account_holder_name,
        bank: offer.bank_name,
        account: `***${offer.account_number?.slice(-4)}`, // Masked for security
      },
      invoice_details: {
        invoice_number: offer.invoice_number,
        vendor_number: offer.vendor_number
      },
      processing_date: new Date().toISOString()
    }

    // Log audit trail using correct audit_events table (not audit_log)
    const auditResult = await executeQuery(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        adminUserId,
        "execute_payment", 
        "early_payment_offer", 
        id, 
        JSON.stringify({
          details: "Payment executed by admin",
          supplier_user_id: offer.supplier_user_id,
          buyer_id: offer.buyer_id,
          previous_status: "approved",
          new_status: "executed",
          payment_amount: offer.offered_amount,
          payment_reference: paymentReference
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
      status: "executed",
      message: "Payment executed successfully",
      payment_instructions: paymentInstructions
    })

  } catch (error) {
    console.error("Error executing payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}