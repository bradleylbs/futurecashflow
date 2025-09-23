import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"
import { sendBuyerMilestoneEmail } from "@/lib/email"
import { getDashboardUrl } from "@/lib/url-utils"

export const runtime = "nodejs"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { signatory_name, signatory_title, signature_method = "electronic" } = await request.json()

    if (!signatory_name) {
      return NextResponse.json({ error: "Signatory name is required" }, { status: 400 })
    }

    // Verify agreement belongs to user and is in presented status; capture buyer context if present
    const agreement = await executeQuery(
      `
      SELECT id, agreement_type, status, counterparty_user_id, buyer_supplier_link_id FROM agreements 
      WHERE id = ? AND user_id = ? AND status = 'presented'
    `,
      [params.id, user.id],
    )

    if (!agreement.success || (agreement.data ?? []).length === 0) {
      return NextResponse.json({ error: "Agreement not found or not available for signing" }, { status: 404 })
    }

    // Get client IP for audit trail
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Sign the agreement
    await executeQuery(
      `
      UPDATE agreements SET
        status = 'signed',
        signed_at = NOW(),
        signature_method = ?,
        signatory_name = ?,
        signatory_title = ?,
        signatory_ip_address = ?,
        signature_data = ?
      WHERE id = ?
    `,
      [
        signature_method,
        signatory_name,
        signatory_title || "",
        clientIP,
        `signed_by_${user.id}_at_${Date.now()}`,
        params.id,
      ],
    )

  // Ensure buyer dashboard is unlocked after signing
    if (user.role === 'buyer') {
      // Get latest dashboard_access row
      const da = await executeQuery(
        `SELECT id, access_level FROM dashboard_access WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      )
      if (da.success && (da.data ?? []).length > 0) {
        const row: any = (da.data as any[])[0]
        await executeQuery(
          `UPDATE dashboard_access SET access_level = 'agreement_signed', agreement_signing_date = NOW(), agreement_id = ?, last_level_change = NOW(), updated_at = NOW() WHERE id = ?`,
          [params.id, row.id]
        )
      } else {
        // Create a new access record if none exists
        await executeQuery(
          `INSERT INTO dashboard_access (user_id, kyc_id, access_level, dashboard_features, agreement_id, agreement_signing_date, last_level_change) VALUES (?, NULL, 'agreement_signed', '[]', ?, NOW(), NOW())`,
          [user.id, params.id]
        )
      }
    }

    const row: any = (agreement.data as any[])[0]

    // If this user was invited as a supplier, mark invitation as completed
    await executeQuery(
      `UPDATE supplier_invitations SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE supplier_user_id = ? AND status IN ('opened','registered','sent')`,
      [user.id]
    )

    // If this is a supplier signing a buyer-tagged agreement, activate the relationship
    if (user.role === 'supplier' && (row?.buyer_supplier_link_id || row?.counterparty_user_id)) {
      if (row?.buyer_supplier_link_id) {
        await executeQuery(
          `UPDATE buyer_supplier_links SET status = 'active', updated_at = NOW() WHERE id = ?`,
          [row.buyer_supplier_link_id]
        )
      } else if (row?.counterparty_user_id) {
        await executeQuery(
          `UPDATE buyer_supplier_links SET status = 'active', updated_at = NOW() WHERE buyer_id = ? AND supplier_user_id = ?`,
          [row.counterparty_user_id, user.id]
        )
      }
    }

    // Notify the correct buyer of agreement signing using counterparty if present, else fallback to last invitation
    let buyerEmail: string | null = null
    if (row?.counterparty_user_id) {
      const b = await executeQuery(`SELECT email FROM users WHERE id = ? LIMIT 1`, [row.counterparty_user_id])
      if (b.success && (b.data as any[])?.[0]?.email) buyerEmail = (b.data as any[])![0].email as string
    }
    if (!buyerEmail) {
      const inv = await executeQuery(
        `SELECT si.buyer_id, u.email as buyer_email FROM supplier_invitations si JOIN users u ON si.buyer_id = u.id WHERE si.supplier_user_id = ? ORDER BY si.created_at DESC LIMIT 1`,
        [user.id]
      )
      if (inv.success && (inv.data ?? []).length > 0) {
        buyerEmail = (inv.data as any[])[0].buyer_email
      }
    }
    if (buyerEmail) {
      await sendBuyerMilestoneEmail(buyerEmail, "Supplier Agreement Signed", {
        heading: "Your invited supplier signed the agreement",
        paragraphs: [
          "The supplier has signed their agreement and the relationship is active.",
          "You're all set to start collaborating.",
        ],
        ctaHref: getDashboardUrl('buyer', request),
      })
    }

    return NextResponse.json({
      message: "Agreement signed successfully",
      agreement: { id: params.id, signed_at: new Date() },
    })
  } catch (error) {
    console.error("Error signing agreement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
