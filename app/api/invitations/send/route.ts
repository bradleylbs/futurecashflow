import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { generateInvitationToken, validateEmail } from "@/lib/auth"
import { sendInvitationEmail } from "@/lib/email"
import { getInvitationUrl, getBaseUrl } from "@/lib/url-utils"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || userRole !== "buyer") {
      return NextResponse.json({ error: "Unauthorized. Only buyers can send invitations." }, { status: 403 })
    }

    // Agreement-based access gate: buyer must have signed agreement to invite suppliers
    const gate = await executeQuery(`SELECT access_level FROM dashboard_access WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId])
    const buyerLevel = gate.success && (gate.data ?? []).length > 0 ? (gate.data as any[])[0].access_level : null

    if (buyerLevel !== "agreement_signed") {
      // Fallback: allow if there's any signed agreement for this user
      const signed = await executeQuery(`SELECT id FROM agreements WHERE user_id = ? AND status = 'signed' ORDER BY signed_at DESC LIMIT 1`, [userId])
      const hasSigned = signed.success && (signed.data ?? []).length > 0
      if (!hasSigned) {
        return NextResponse.json({ error: "Please sign your agreement before inviting suppliers." }, { status: 403 })
      }
    }

    const { companyName, email, message } = await request.json()

    // Validate input
    if (!companyName || !email) {
      return NextResponse.json({ error: "Company name and email are required" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if invitation already exists for this email
    const existingQuery = `
      SELECT id, status, expires_at 
      FROM supplier_invitations 
      WHERE buyer_id = ? AND invited_email = ? AND status NOT IN ('expired', 'cancelled')
    `
    const existingResult = await executeQuery(existingQuery, [userId, email])

    if (existingResult.success && (existingResult.data ?? []).length > 0) {
      const existing = (existingResult.data as any[])[0]
      if (new Date(existing.expires_at) > new Date()) {
        return NextResponse.json(
          {
            error: "An active invitation already exists for this email address",
          },
          { status: 409 },
        )
      }
    }

    // Generate invitation token and expiry
    const invitationToken = generateInvitationToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invitation record
    const insertQuery = `
      INSERT INTO supplier_invitations (
        buyer_id, invited_company_name, invited_email, invitation_message, 
        invitation_token, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `

    const result = await executeQuery(insertQuery, [
      userId,
      companyName,
      email,
      message || null,
      invitationToken,
      expiresAt,
    ])

    if (!result.success) {
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 })
    }

    // Get buyer info for email
    const buyerQuery = `SELECT email FROM users WHERE id = ?`
    const buyerResult = await executeQuery(buyerQuery, [userId])
    const buyerEmail = buyerResult.success ? (buyerResult.data as any[])[0]?.email : "KYC Platform"

    // Fetch created invitation row to get id and expiry
    const createdSelect = await executeQuery(
      `SELECT id, invitation_token, expires_at FROM supplier_invitations WHERE buyer_id = ? AND invited_email = ? ORDER BY created_at DESC LIMIT 1`,
      [userId, email],
    )
    const created = createdSelect.success && (createdSelect.data ?? []).length > 0 ? (createdSelect.data as any[])[0] : null

    // Send invitation email
    const emailSent = await sendInvitationEmail(buyerEmail, email, companyName, invitationToken, message, request)

    if (!emailSent) {
      // Update invitation status to indicate email failure
      await executeQuery(`UPDATE supplier_invitations SET email_delivery_status = 'failed' WHERE id = ?`, [
        created?.id,
      ])
      return NextResponse.json({ error: "Failed to send invitation email" }, { status: 500 })
    }

    // Update email delivery status
    await executeQuery(`UPDATE supplier_invitations SET email_delivery_status = 'sent' WHERE id = ?`, [
      created?.id,
    ])

    // Use dynamic URL detection based on request context
    const signupUrl = getInvitationUrl(created?.invitation_token || '', request)
    const secureCode = String(created?.invitation_token || '').slice(0, 8).toUpperCase()

    // If the invited email already belongs to an existing supplier,
    // link the invitation, create/ensure a relationship, and present a buyer-specific supplier agreement
    let supplierExisting = false
    let agreementPresented = false
    let relationshipLinked = false
    try {
      const existingSupplier = await executeQuery(
        `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND LOWER(role) = 'supplier' LIMIT 1`,
        [email]
      )
      if (existingSupplier.success && (existingSupplier.data ?? []).length > 0) {
        supplierExisting = true
        const supplierId = (existingSupplier.data as any[])[0].id

        // Check supplier access level
        const accessQ = await executeQuery(
          `SELECT access_level FROM dashboard_access WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
          [supplierId]
        )
        const accessLevel = accessQ.success && (accessQ.data ?? []).length > 0
          ? (accessQ.data as any[])[0].access_level
          : 'pre_kyc'

        const isApprovedOrBeyond = [
          'kyc_approved',
          'banking_submitted',
          'agreement_presented',
          'agreement_signed',
          'banking_verified',
        ].includes(String(accessLevel || '').toLowerCase())

        // 1) Link invitation to supplier
        if (created?.id) {
          await executeQuery(
            `UPDATE supplier_invitations SET supplier_user_id = ?, updated_at = NOW() WHERE id = ?`,
            [supplierId, created.id]
          )
        }

        // 2) Create/ensure a buyer-supplier relationship link
        await executeQuery(
          `INSERT INTO buyer_supplier_links (buyer_id, supplier_user_id, invitation_id, status, relationship_source)
           VALUES (?, ?, ?, 'initiated', 'invitation')
           ON DUPLICATE KEY UPDATE invitation_id = VALUES(invitation_id), updated_at = NOW()`,
          [userId, supplierId, created?.id || null]
        )
        relationshipLinked = true

        // Retrieve relationship id for tagging the agreement
        let linkId: string | null = null
        const linkRow = await executeQuery(
          `SELECT id FROM buyer_supplier_links WHERE buyer_id = ? AND supplier_user_id = ? LIMIT 1`,
          [userId, supplierId]
        )
        if (linkRow.success && (linkRow.data as any[])?.[0]?.id) linkId = (linkRow.data as any[])![0].id as string

        // Always present a buyer-scoped supplier agreement on invite for existing suppliers
        // Avoid duplicates for this buyer
        let existingAgreement: any = await executeQuery(
          `SELECT id FROM agreements 
             WHERE user_id = ? 
               AND agreement_type = 'supplier_terms' 
               AND status IN ('presented','signed')
               AND counterparty_user_id = ?
             LIMIT 1`,
          [supplierId, userId]
        )
        // Backward compatibility: if counterparty_user_id doesn't exist yet, fallback check
        if (!existingAgreement.success) {
          existingAgreement = await executeQuery(
            `SELECT id FROM agreements WHERE user_id = ? AND agreement_type = 'supplier_terms' AND status IN ('presented','signed') LIMIT 1`,
            [supplierId]
          )
        }
        if (!(existingAgreement.success && (existingAgreement.data ?? []).length > 0)) {
          // Get latest supplier_terms template
          const template = await executeQuery(
            `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
          )
          if (template.success && (template.data ?? []).length > 0) {
            const t: any = (template.data as any[])[0]
            const ins = await executeQuery(
              `INSERT INTO agreements (
                 user_id, counterparty_user_id, buyer_supplier_link_id,
                 agreement_type, agreement_version, template_id, agreement_content, status, presented_at
               ) VALUES (?, ?, ?, 'supplier_terms', ?, ?, ?, 'presented', NOW())`,
              [supplierId, userId, linkId, t.version, t.id, t.content_template]
            )
            agreementPresented = !!ins.success
          } else {
            // Fallback minimal content if no template available
            const fallback = `SUPPLIER TERMS\n\nBy signing below, you acknowledge that you have read, understood, and agree to be bound by these supplier terms.`
            const ins = await executeQuery(
              `INSERT INTO agreements (
                 user_id, counterparty_user_id, buyer_supplier_link_id,
                 agreement_type, agreement_version, template_id, agreement_content, status, presented_at
               ) VALUES (?, ?, ?, 'supplier_terms', '1.0', NULL, ?, 'presented', NOW())`,
              [supplierId, userId, linkId, fallback]
            )
            agreementPresented = !!ins.success
          }
        }
      }
    } catch (e) {
      // Non-fatal; continue response
      console.error('Auto-present agreement for existing supplier failed:', e)
    }

    return NextResponse.json({
      message: "Invitation sent successfully",
      invitationId: created?.id,
      expiresAt: created?.expires_at,
      secureCode,
      signupUrl,
      supplierExisting,
      relationshipLinked,
      agreementPresented,
    })
  } catch (error) {
    console.error("Send invitation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
