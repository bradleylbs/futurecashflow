import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    // Validate token and fetch invitation
    const result = await executeQuery(
      `SELECT id, buyer_id, invited_company_name, invited_email, invitation_message, status, expires_at, supplier_user_id
       FROM supplier_invitations
       WHERE invitation_token = ?`,
      [token],
    )

    if (!result.success || (result.data ?? []).length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    const invitation: any = (result.data as any[])[0]
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 400 })
    }

    // Mark as opened if first time
    if (invitation.status === "sent") {
      await executeQuery(`UPDATE supplier_invitations SET status = 'opened', opened_at = NOW(), updated_at = NOW() WHERE id = ?`, [invitation.id])
      invitation.status = 'opened'
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        buyer_id: invitation.buyer_id,
        companyName: invitation.invited_company_name,
        email: invitation.invited_email,
        message: invitation.invitation_message,
        status: invitation.status,
        expires_at: invitation.expires_at,
      },
    })
  } catch (error) {
    console.error("Validate invitation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
