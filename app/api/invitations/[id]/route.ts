import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
  const invitationId = id

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (userRole === "buyer") {
      // Buyer cancels invitation
      const checkQuery = `SELECT id, status, expires_at FROM supplier_invitations WHERE id = ? AND buyer_id = ?`
      const checkResult = await executeQuery(checkQuery, [invitationId, userId])
      if (!checkResult.success || (checkResult.data ?? []).length === 0) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
      }
      const invitation: any = (checkResult.data as any[])[0]
      if (invitation.status === "completed") {
        return NextResponse.json({ error: "Cannot cancel completed invitations" }, { status: 400 })
      }
      const cancelQuery = `UPDATE supplier_invitations SET status = 'cancelled', updated_at = NOW() WHERE id = ?`
      const result = await executeQuery(cancelQuery, [invitationId])
      if (!result.success) {
        return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 })
      }
      return NextResponse.json({ message: "Invitation cancelled successfully" })
    } else if (userRole === "supplier") {
      // Supplier rejects invitation
      const checkQuery = `SELECT id, status FROM supplier_invitations WHERE id = ? AND supplier_user_id = ?`
      const checkResult = await executeQuery(checkQuery, [invitationId, userId])
      if (!checkResult.success || (checkResult.data ?? []).length === 0) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
      }
      const invitation: any = (checkResult.data as any[])[0]
      if (["accepted", "rejected", "cancelled", "completed"].includes(invitation.status)) {
        return NextResponse.json({ error: "Invitation already processed" }, { status: 400 })
      }
      const rejectQuery = `UPDATE supplier_invitations SET status = 'rejected', rejected_at = NOW(), updated_at = NOW() WHERE id = ?`
      const result = await executeQuery(rejectQuery, [invitationId])
      if (!result.success) {
        return NextResponse.json({ error: "Failed to reject invitation" }, { status: 500 })
      }
      return NextResponse.json({ message: "Invitation rejected successfully" })
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  } catch (error) {
    console.error("Cancel/reject invitation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
  const invitationId = id
    const { action } = await request.json()

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (userRole === "buyer" && action === "resend") {
      // Buyer resends invitation
      const getQuery = `SELECT id, invited_company_name, invited_email, invitation_message, invitation_token, status, expires_at FROM supplier_invitations WHERE id = ? AND buyer_id = ?`
      const getResult = await executeQuery(getQuery, [invitationId, userId])
      if (!getResult.success || (getResult.data ?? []).length === 0) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
      }
      const invitation: any = (getResult.data as any[])[0]
      if (invitation.status === "completed") {
        return NextResponse.json({ error: "Cannot resend completed invitations" }, { status: 400 })
      }
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      const updateQuery = `UPDATE supplier_invitations SET expires_at = ?, status = 'sent', sent_at = NOW(), email_delivery_status = 'pending', updated_at = NOW() WHERE id = ?`
      await executeQuery(updateQuery, [newExpiresAt, invitationId])
      const buyerQuery = `SELECT email FROM users WHERE id = ?`
      const buyerResult = await executeQuery(buyerQuery, [userId])
      const buyerEmail = buyerResult.success ? (buyerResult.data as any[])[0]?.email : "KYC Platform"
      const { sendInvitationEmail } = await import("@/lib/email")
      const emailSent = await sendInvitationEmail(
        buyerEmail,
        invitation.invited_email,
        invitation.invited_company_name,
        invitation.invitation_token,
        invitation.invitation_message,
        request,
      )
      const deliveryStatus = emailSent ? "sent" : "failed"
      await executeQuery(`UPDATE supplier_invitations SET email_delivery_status = ? WHERE id = ?`, [deliveryStatus, invitationId])
      if (!emailSent) {
        return NextResponse.json({ error: "Failed to resend invitation email" }, { status: 500 })
      }
      return NextResponse.json({ message: "Invitation resent successfully", expiresAt: newExpiresAt })
    } else if (userRole === "supplier" && action === "accept") {
      // Supplier accepts invitation
      const checkQuery = `SELECT id, status FROM supplier_invitations WHERE id = ? AND supplier_user_id = ?`
      const checkResult = await executeQuery(checkQuery, [invitationId, userId])
      if (!checkResult.success || (checkResult.data ?? []).length === 0) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
      }
      const invitation: any = (checkResult.data as any[])[0]
      if (["accepted", "rejected", "cancelled", "completed"].includes(invitation.status)) {
        return NextResponse.json({ error: "Invitation already processed" }, { status: 400 })
      }
      const acceptQuery = `UPDATE supplier_invitations SET status = 'accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = ?`
      const result = await executeQuery(acceptQuery, [invitationId])
      if (!result.success) {
        return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 })
      }
      return NextResponse.json({ message: "Invitation accepted successfully" })
    } else {
      return NextResponse.json({ error: "Invalid action or role" }, { status: 400 })
    }
  } catch (error) {
    console.error("Resend/accept invitation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
