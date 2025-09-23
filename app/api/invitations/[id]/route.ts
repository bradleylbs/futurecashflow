import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || userRole !== "buyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const invitationId = params.id

    // Verify invitation belongs to this buyer and can be cancelled
    const checkQuery = `
      SELECT id, status, expires_at 
      FROM supplier_invitations 
      WHERE id = ? AND buyer_id = ?
    `
    const checkResult = await executeQuery(checkQuery, [invitationId, userId])

  if (!checkResult.success || (checkResult.data ?? []).length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

  const invitation: any = (checkResult.data as any[])[0]

    if (invitation.status === "completed") {
      return NextResponse.json(
        {
          error: "Cannot cancel completed invitations",
        },
        { status: 400 },
      )
    }

    // Cancel the invitation
    const cancelQuery = `
      UPDATE supplier_invitations 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ?
    `
    const result = await executeQuery(cancelQuery, [invitationId])

    if (!result.success) {
      return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 })
    }

    return NextResponse.json({ message: "Invitation cancelled successfully" })
  } catch (error) {
    console.error("Cancel invitation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || userRole !== "buyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const invitationId = params.id
    const { action } = await request.json()

    if (action !== "resend") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get invitation details
    const getQuery = `
      SELECT id, invited_company_name, invited_email, invitation_message, 
             invitation_token, status, expires_at
      FROM supplier_invitations 
      WHERE id = ? AND buyer_id = ?
    `
    const getResult = await executeQuery(getQuery, [invitationId, userId])

  if (!getResult.success || (getResult.data ?? []).length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

  const invitation: any = (getResult.data as any[])[0]

    if (invitation.status === "completed") {
      return NextResponse.json(
        {
          error: "Cannot resend completed invitations",
        },
        { status: 400 },
      )
    }

    // Extend expiry and resend
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const updateQuery = `
      UPDATE supplier_invitations 
      SET expires_at = ?, status = 'sent', sent_at = NOW(), email_delivery_status = 'pending', updated_at = NOW()
      WHERE id = ?
    `
    await executeQuery(updateQuery, [newExpiresAt, invitationId])

    // Get buyer info and resend email
  const buyerQuery = `SELECT email FROM users WHERE id = ?`
    const buyerResult = await executeQuery(buyerQuery, [userId])
  const buyerEmail = buyerResult.success ? (buyerResult.data as any[])[0]?.email : "KYC Platform"

    // Import sendInvitationEmail here to avoid circular imports
    const { sendInvitationEmail } = await import("@/lib/email")

    const emailSent = await sendInvitationEmail(
      buyerEmail,
      invitation.invited_email,
      invitation.invited_company_name,
      invitation.invitation_token,
      invitation.invitation_message,
      request,
    )

    // Update email delivery status
    const deliveryStatus = emailSent ? "sent" : "failed"
    await executeQuery(`UPDATE supplier_invitations SET email_delivery_status = ? WHERE id = ?`, [
      deliveryStatus,
      invitationId,
    ])

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to resend invitation email" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Invitation resent successfully",
      expiresAt: newExpiresAt,
    })
  } catch (error) {
    console.error("Resend invitation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
