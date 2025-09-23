import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"
import { encryptSensitive } from "@/lib/crypto"
import { sendBuyerMilestoneEmail } from "@/lib/email"
import { getDashboardUrl } from "@/lib/url-utils"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyJWT(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bank_name, account_number, routing_number, account_holder_name } = await request.json()
    if (!bank_name || !account_number || !routing_number || !account_holder_name) {
      return NextResponse.json({ error: "All banking fields are required" }, { status: 400 })
    }

    // Ensure KYC is approved
    const kyc = await executeQuery(
      `SELECT k.id, k.status FROM kyc_records k WHERE k.user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [user.id],
    )
    if (!kyc.success || (kyc.data ?? []).length === 0) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
    }
    const kycRecord: any = (kyc.data as any[])[0]
    if (kycRecord.status !== "approved") {
      return NextResponse.json({ error: "Banking details can only be submitted after KYC approval" }, { status: 400 })
    }

    // Upsert banking details
    const existing = await executeQuery(`SELECT id FROM banking_details WHERE user_id = ? LIMIT 1`, [user.id])
    if (existing.success && (existing.data ?? []).length > 0) {
      const bid = (existing.data as any[])[0].id
      await executeQuery(
        `UPDATE banking_details SET bank_name = ?, account_number = ?, routing_number = ?, account_holder_name = ?, status = 'pending', submission_date = NOW(), updated_at = NOW() WHERE id = ?`,
        [bank_name, encryptSensitive(account_number), encryptSensitive(routing_number), account_holder_name, bid],
      )
    } else {
      await executeQuery(
        `INSERT INTO banking_details (user_id, bank_name, account_number, routing_number, account_holder_name) VALUES (?, ?, ?, ?, ?)`,
        [user.id, bank_name, encryptSensitive(account_number), encryptSensitive(routing_number), account_holder_name],
      )
    }

    // Move dashboard to banking_submitted and record date
    await executeQuery(
      `UPDATE dashboard_access SET access_level = 'banking_submitted', banking_submission_date = NOW(), last_level_change = NOW() WHERE user_id = ?`,
      [user.id],
    )

    // If this is an invited supplier, notify the buyer
    const inv = await executeQuery(
      `SELECT si.buyer_id, u.email as buyer_email FROM supplier_invitations si JOIN users u ON si.buyer_id = u.id WHERE si.supplier_user_id = ? ORDER BY si.created_at DESC LIMIT 1`,
      [user.id]
    )
    if (inv.success && (inv.data ?? []).length > 0) {
      const buyerEmail = (inv.data as any[])[0].buyer_email
      if (buyerEmail) {
        await sendBuyerMilestoneEmail(buyerEmail, "Supplier Banking Submitted", {
          heading: "Your invited supplier submitted banking details",
          paragraphs: [
            "They've provided banking information for verification.",
            "You'll be notified once it's verified.",
          ],
          ctaHref: getDashboardUrl('buyer', request),
        })
      }
    }

    return NextResponse.json({ message: "Banking details submitted" })
  } catch (error) {
    console.error("Banking submission error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
