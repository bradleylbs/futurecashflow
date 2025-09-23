import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { sendBuyerMilestoneEmail, sendSupplierBankingResubmissionEmail } from "@/lib/email"
import { getDashboardUrl } from "@/lib/url-utils"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || !["admin", "fm_admin", "fa_admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    const bankingId = params.id
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const decision: string = (body?.decision || "").toString()
    const notes: string | undefined = body?.notes

    // Map UI decisions to DB ENUM values
    const statusMap: Record<string, "verified" | "rejected" | "resubmission_required"> = {
      verify: "verified",
      reject: "rejected",
      resubmission_required: "resubmission_required",
    }
    if (!Object.prototype.hasOwnProperty.call(statusMap, decision)) {
      return NextResponse.json({ error: "Invalid decision. Must be 'verify', 'reject' or 'resubmission_required'" }, { status: 400 })
    }

  const getQuery = `SELECT id, user_id, status FROM banking_details WHERE id = ?`
    const current = await executeQuery(getQuery, [bankingId])
    if (!current.success || (current.data ?? []).length === 0) {
      return NextResponse.json({ error: "Banking details not found" }, { status: 404 })
    }

    const banking: any = (current.data as any[])[0]

  const newStatus = statusMap[decision]
  const verificationDateSql = newStatus === "verified" ? ", verification_date = NOW()" : ""
  const resubmissionSql = newStatus === "resubmission_required" ? ", resubmission_count = resubmission_count + 1" : ""

    const update = await executeQuery(
      `UPDATE banking_details 
       SET status = ?, verification_notes = ?, admin_verifier_id = ?, updated_at = NOW()${verificationDateSql}${resubmissionSql}
       WHERE id = ?`,
      [newStatus, notes || null, userId, bankingId]
    )

    if (!update.success) {
      return NextResponse.json({ error: "Failed to update banking verification" }, { status: 500 })
    }

    // If resubmission required, notify the supplier
    if (newStatus === "resubmission_required") {
      // Look up supplier email and optional company name
      const supplier = await executeQuery(
        `SELECT u.email, c.company_name 
           FROM users u 
           LEFT JOIN companies c ON c.user_id = u.id AND c.company_type = 'supplier'
          WHERE u.id = ?
          LIMIT 1`,
        [banking.user_id]
      )
      if (supplier.success && (supplier.data ?? []).length > 0) {
        const row: any = (supplier.data as any[])[0]
        const supplierEmail = row.email
        const companyName = row.company_name || undefined
        if (supplierEmail) {
          try {
            await sendSupplierBankingResubmissionEmail(supplierEmail, companyName, notes, request)
          } catch (e) {
            console.warn("Email notification failed (banking resubmission)", e)
          }
        }
      }
    }

    // If verified, unlock premium features and ensure supplier agreement is presented
    if (newStatus === "verified") {
      await executeQuery(
        `UPDATE dashboard_access 
         SET access_level = 'banking_verified', banking_verification_date = NOW(), last_level_change = NOW()
         WHERE user_id = ?`,
        [banking.user_id]
      )

      // Ensure a buyer-scoped supplier agreement is presented to the supplier if invited
      try {
        const inv = await executeQuery(
          `SELECT buyer_id FROM supplier_invitations WHERE supplier_user_id = ? ORDER BY created_at DESC LIMIT 1`,
          [banking.user_id]
        )
        const buyerId = inv.success && (inv.data ?? []).length > 0 ? (inv.data as any[])[0].buyer_id : null
        if (buyerId) {
          const existingAgreement = await executeQuery(
            `SELECT id FROM agreements 
               WHERE user_id = ? AND agreement_type = 'supplier_terms' 
                 AND counterparty_user_id = ? AND status IN ('presented','signed')
               LIMIT 1`,
            [banking.user_id, buyerId]
          )
          if (!(existingAgreement.success && (existingAgreement.data ?? []).length > 0)) {
            const tpl = await executeQuery(
              `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
            )
            if (tpl.success && (tpl.data ?? []).length > 0) {
              const t: any = (tpl.data as any[])[0]
              await executeQuery(
                `INSERT INTO agreements (
                   user_id, agreement_type, agreement_version, template_id, agreement_content, status, presented_at, counterparty_user_id
                 ) VALUES (?, 'supplier_terms', ?, ?, ?, 'presented', NOW(), ?)`,
                [banking.user_id, t.version, t.id, t.content_template, buyerId]
              )
            }
          }
        }
      } catch (e) {
        console.warn('Auto-present supplier agreement after banking verification failed:', e)
      }

      // Notify buyer if this user is a supplier invited by a buyer
      const inv2 = await executeQuery(
        `SELECT si.buyer_id, u.email as buyer_email FROM supplier_invitations si JOIN users u ON si.buyer_id = u.id WHERE si.supplier_user_id = ? ORDER BY si.created_at DESC LIMIT 1`,
        [banking.user_id]
      )
      if (inv2.success && (inv2.data ?? []).length > 0) {
        const buyerEmail = (inv2.data as any[])[0].buyer_email
        if (buyerEmail) {
          try {
            await sendBuyerMilestoneEmail(buyerEmail, "Supplier Banking Verified", {
              heading: "Your invited supplier's banking is verified",
              paragraphs: [
                "The supplier has passed banking verification.",
                "You can proceed with agreements and onboarding steps.",
              ],
              ctaHref: getDashboardUrl('buyer', request),
            })
          } catch (e) {
            console.warn("Email notification failed (banking verified)", e)
          }
        }
      }
    }

    return NextResponse.json({
      message: `Banking details ${decision} successfully`,
      banking: { id: bankingId, status: newStatus },
    })
  } catch (error) {
    console.error("Banking verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
