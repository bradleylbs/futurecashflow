import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

// Ensure MySQL compatibility
export const runtime = "nodejs"

// Get user agreements
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let agreements = await executeQuery(
      `
      SELECT 
        a.id, a.agreement_type, a.agreement_version, a.status,
        a.agreement_content,
        a.presented_at, a.signed_at, a.expiry_date, a.created_at,
        a.counterparty_user_id,
        cu.email AS counterparty_email,
        bc.company_name AS counterparty_company_name
      FROM agreements a
      LEFT JOIN users cu ON cu.id = a.counterparty_user_id
      LEFT JOIN companies bc ON bc.user_id = cu.id AND bc.company_type = 'buyer'
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `,
      [user.id],
    )

  // Auto-present agreements based on user role and access level when none exist yet
  if (agreements.success && (agreements.data as any[])?.length === 0) {
      if (user.role === 'buyer') {
        // Auto-present facility agreement for buyers
        let template = await executeQuery(
          `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'facility_agreement' AND is_active = true ORDER BY version DESC LIMIT 1`
        )
        if (!template.success || (template.data ?? []).length === 0) {
          // Seed a default facility agreement template if none exists
          const defaultContent = `FACILITY AGREEMENT\n\nThis agreement establishes a credit facility for the Buyer to manage supplier relationships and transactions.\n\nBy signing below, you acknowledge that you have read, understood, and agree to be bound by this facility agreement.`
          await executeQuery(
            `INSERT INTO agreement_templates (template_name, template_type, version, content_template, is_active) VALUES ('Standard Facility Agreement', 'facility_agreement', '1.0', ?, true)`,
            [defaultContent]
          )
          // Requery template
          template = await executeQuery(
            `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'facility_agreement' AND is_active = true ORDER BY version DESC LIMIT 1`
          )
        }
        if (template.success && (template.data ?? []).length > 0) {
          const t: any = (template.data as any[])[0]
          await executeQuery(
            `INSERT INTO agreements (user_id, agreement_type, agreement_version, template_id, agreement_content, status, presented_at) VALUES (?, 'facility_agreement', ?, ?, ?, 'presented', NOW())`,
            [user.id, t.version, t.id, t.content_template]
          )
        } else {
          // Last-resort fallback: create agreement without template_id
          const fallbackContent = `FACILITY AGREEMENT\n\nThis agreement establishes a credit facility for the Buyer to manage supplier relationships and transactions.\n\nBy signing below, you acknowledge that you have read, understood, and agree to be bound by this facility agreement.`
          await executeQuery(
            `INSERT INTO agreements (user_id, agreement_type, agreement_version, template_id, agreement_content, status, presented_at) VALUES (?, 'facility_agreement', '1.0', NULL, ?, 'presented', NOW())`,
            [user.id, fallbackContent]
          )
        }
      } else if (user.role === 'supplier') {
        // Check access level - present if banking has been submitted or verified; also fall back to explicit banking_details status
        const dashAccess = await executeQuery(
          `SELECT access_level FROM dashboard_access WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
          [user.id]
        )
        const accessLevel = dashAccess.success && (dashAccess.data ?? []).length > 0
          ? (dashAccess.data as any[])[0].access_level
          : 'pre_kyc'

        let readyForAgreement = accessLevel === 'banking_submitted' || accessLevel === 'banking_verified'
        if (!readyForAgreement) {
          const bank = await executeQuery(`SELECT status FROM banking_details WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [user.id])
          const bankStatus = bank.success && (bank.data ?? []).length > 0 ? (bank.data as any[])[0].status : null
          readyForAgreement = bankStatus === 'verified'
        }

        if (readyForAgreement) {
          // Prefer buyer-scoped agreement when invited by a buyer
          const inv = await executeQuery(
            `SELECT buyer_id FROM supplier_invitations WHERE supplier_user_id = ? ORDER BY created_at DESC LIMIT 1`,
            [user.id]
          )
          const buyerId = inv.success && (inv.data ?? []).length > 0 ? (inv.data as any[])[0].buyer_id : null

          // Only create if not already existing for this buyer
          let shouldCreate = true
          if (buyerId) {
            const exists = await executeQuery(
              `SELECT id FROM agreements WHERE user_id = ? AND agreement_type = 'supplier_terms' AND counterparty_user_id = ? AND status IN ('presented','signed') LIMIT 1`,
              [user.id, buyerId]
            )
            if (exists.success && (exists.data ?? []).length > 0) {
              shouldCreate = false
            }
          } else {
            // If no buyer invitation, create a generic supplier_terms agreement
            const existsGeneric = await executeQuery(
              `SELECT id FROM agreements WHERE user_id = ? AND agreement_type = 'supplier_terms' AND counterparty_user_id IS NULL AND status IN ('presented','signed') LIMIT 1`,
              [user.id]
            )
            if (existsGeneric.success && (existsGeneric.data ?? []).length > 0) {
              shouldCreate = false
            }
          }

          if (shouldCreate) {
            let template = await executeQuery(
              `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
            )
            if (!(template.success && (template.data ?? []).length > 0)) {
              const defaultSupplierContent = `SUPPLIER TERMS\n\nBy signing below, you acknowledge that you have read, understood, and agree to be bound by these supplier terms.`
              // Seed default template
              await executeQuery(
                `INSERT INTO agreement_templates (template_name, template_type, version, content_template, is_active) VALUES ('Standard Supplier Terms', 'supplier_terms', '1.0', ?, true)`,
                [defaultSupplierContent]
              )
              template = await executeQuery(
                `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
              )
            }
            if (template.success && (template.data ?? []).length > 0) {
              const t: any = (template.data as any[])[0]
              await executeQuery(
                `INSERT INTO agreements (user_id, agreement_type, agreement_version, template_id, agreement_content, status, presented_at, counterparty_user_id) VALUES (?, 'supplier_terms', ?, ?, ?, 'presented', NOW(), ?)` ,
                [user.id, t.version, t.id, t.content_template, buyerId]
              )
            }
          }
        }
      }
      
      // Re-query agreements after potential creation
      agreements = await executeQuery(
        `
        SELECT 
          a.id, a.agreement_type, a.agreement_version, a.status,
          a.agreement_content,
          a.presented_at, a.signed_at, a.expiry_date, a.created_at,
          a.counterparty_user_id,
          cu.email AS counterparty_email,
          bc.company_name AS counterparty_company_name
        FROM agreements a
        LEFT JOIN users cu ON cu.id = a.counterparty_user_id
        LEFT JOIN companies bc ON bc.user_id = cu.id AND bc.company_type = 'buyer'
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
        `,
        [user.id]
      )
    }

    // Additional safeguard: if supplier is invited and banking is submitted/verified but buyer-scoped agreement wasn't present earlier, create now
    if (user.role === 'supplier') {
      const dashAccess2 = await executeQuery(
        `SELECT access_level FROM dashboard_access WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      )
      const accessLevel2 = dashAccess2.success && (dashAccess2.data ?? []).length > 0
        ? (dashAccess2.data as any[])[0].access_level
        : 'pre_kyc'

      if (accessLevel2 === 'banking_submitted' || accessLevel2 === 'banking_verified') {
        const inv2 = await executeQuery(
          `SELECT buyer_id FROM supplier_invitations WHERE supplier_user_id = ? ORDER BY created_at DESC LIMIT 1`,
          [user.id]
        )
        const buyerId2 = inv2.success && (inv2.data ?? []).length > 0 ? (inv2.data as any[])[0].buyer_id : null

        if (buyerId2) {
          const exists2 = await executeQuery(
            `SELECT id FROM agreements WHERE user_id = ? AND agreement_type = 'supplier_terms' AND counterparty_user_id = ? AND status IN ('presented','signed') LIMIT 1`,
            [user.id, buyerId2]
          )
          if (!(exists2.success && (exists2.data ?? []).length > 0)) {
            const tpl = await executeQuery(
              `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
            )
            if (!(tpl.success && (tpl.data ?? []).length > 0)) {
              const defaultSupplierContent2 = `SUPPLIER TERMS\n\nBy signing below, you acknowledge that you have read, understood, and agree to be bound by these supplier terms.`
              await executeQuery(
                `INSERT INTO agreement_templates (template_name, template_type, version, content_template, is_active) VALUES ('Standard Supplier Terms', 'supplier_terms', '1.0', ?, true)`,
                [defaultSupplierContent2]
              )
            }
            const tpl2 = await executeQuery(
              `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
            )
            if (tpl2.success && (tpl2.data ?? []).length > 0) {
              const t: any = (tpl2.data as any[])[0]
              await executeQuery(
                `INSERT INTO agreements (user_id, agreement_type, agreement_version, template_id, agreement_content, status, presented_at, counterparty_user_id) VALUES (?, 'supplier_terms', ?, ?, ?, 'presented', NOW(), ?)`,
                [user.id, t.version, t.id, t.content_template, buyerId2]
              )
              // Re-query agreements to include the newly created one
              agreements = await executeQuery(
                `
                SELECT 
                  a.id, a.agreement_type, a.agreement_version, a.status,
                  a.agreement_content,
                  a.presented_at, a.signed_at, a.expiry_date, a.created_at,
                  a.counterparty_user_id,
                  cu.email AS counterparty_email,
                  bc.company_name AS counterparty_company_name
                FROM agreements a
                LEFT JOIN users cu ON cu.id = a.counterparty_user_id
                LEFT JOIN companies bc ON bc.user_id = cu.id AND bc.company_type = 'buyer'
                WHERE a.user_id = ?
                ORDER BY a.created_at DESC
                `,
                [user.id]
              )
            }
          }
        } else {
          // No buyer; ensure a generic presented supplier_terms exists
          const existsGen2 = await executeQuery(
            `SELECT id FROM agreements WHERE user_id = ? AND agreement_type = 'supplier_terms' AND counterparty_user_id IS NULL AND status IN ('presented','signed') LIMIT 1`,
            [user.id]
          )
          if (!(existsGen2.success && (existsGen2.data ?? []).length > 0)) {
            let tplg = await executeQuery(
              `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
            )
            if (!(tplg.success && (tplg.data ?? []).length > 0)) {
              const defaultSupplierContent3 = `SUPPLIER TERMS\n\nBy signing below, you acknowledge that you have read, understood, and agree to be bound by these supplier terms.`
              await executeQuery(
                `INSERT INTO agreement_templates (template_name, template_type, version, content_template, is_active) VALUES ('Standard Supplier Terms', 'supplier_terms', '1.0', ?, true)`,
                [defaultSupplierContent3]
              )
              tplg = await executeQuery(
                `SELECT id, content_template, version FROM agreement_templates WHERE template_type = 'supplier_terms' AND is_active = true ORDER BY version DESC LIMIT 1`
              )
            }
            if (tplg.success && (tplg.data ?? []).length > 0) {
              const t: any = (tplg.data as any[])[0]
              await executeQuery(
                `INSERT INTO agreements (user_id, agreement_type, agreement_version, template_id, agreement_content, status, presented_at, counterparty_user_id) VALUES (?, 'supplier_terms', ?, ?, ?, 'presented', NOW(), NULL)`,
                [user.id, t.version, t.id, t.content_template]
              )
              agreements = await executeQuery(
                `
                SELECT 
                  a.id, a.agreement_type, a.agreement_version, a.status,
                  a.agreement_content,
                  a.presented_at, a.signed_at, a.expiry_date, a.created_at,
                  a.counterparty_user_id,
                  cu.email AS counterparty_email,
                  bc.company_name AS counterparty_company_name
                FROM agreements a
                LEFT JOIN users cu ON cu.id = a.counterparty_user_id
                LEFT JOIN companies bc ON bc.user_id = cu.id AND bc.company_type = 'buyer'
                WHERE a.user_id = ?
                ORDER BY a.created_at DESC
                `,
                [user.id]
              )
            }
          }
        }
      }
    }

    return NextResponse.json({ agreements: agreements.success ? agreements.data : [] })
  } catch (error) {
    console.error("Error fetching agreements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create agreement for user
export async function POST(request: NextRequest) {
  try {
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

  const { agreement_type } = await request.json()

    if (!agreement_type || !["supplier_terms", "buyer_terms", "facility_agreement"].includes(agreement_type)) {
      return NextResponse.json({ error: "Invalid agreement type" }, { status: 400 })
    }

    // For supplier flow, enforce agreement can only be created after banking submission
    const dash = await executeQuery(`SELECT access_level FROM dashboard_access WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [user.id])
    const accessLevel = dash.success && (dash.data ?? []).length > 0 ? (dash.data as any[])[0].access_level : null
    if (user.role === "supplier") {
      // Allow if banking_submitted or banking_verified; otherwise check explicit banking_details status
      if (accessLevel !== "banking_submitted" && accessLevel !== "banking_verified") {
        const bank = await executeQuery(`SELECT status FROM banking_details WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [user.id])
        const bankStatus = bank.success && (bank.data ?? []).length > 0 ? (bank.data as any[])[0].status : null
        if (bankStatus !== 'verified') {
          return NextResponse.json({ error: "Agreement can only be presented after banking submission or verification" }, { status: 400 })
        }
      }
    }

    // Check if user already has a pending/signed agreement of this type
    const existing = await executeQuery(
      `
      SELECT id FROM agreements 
      WHERE user_id = ? AND agreement_type = ? AND status IN ('pending', 'presented', 'signed')
    `,
      [user.id, agreement_type],
    )

  if (existing.success && (existing.data ?? []).length > 0) {
      return NextResponse.json({ error: "Agreement already exists" }, { status: 400 })
    }

    // Get the latest template for this agreement type
    const template = await executeQuery(
      `
      SELECT id, content_template, version, variables
      FROM agreement_templates 
      WHERE template_type = ? AND is_active = true
      ORDER BY version DESC LIMIT 1
    `,
      [agreement_type],
    )

  if (!template.success || (template.data ?? []).length === 0) {
      return NextResponse.json({ error: "No template found for agreement type" }, { status: 400 })
    }

  const templateData: any = (template.data as any[])[0]

    // Create agreement with template content
    // If supplier is invited by a buyer, attach buyer context for a buyer-scoped agreement
    let counterparty: string | null = null
    if (user.role === 'supplier') {
      const inv = await executeQuery(`SELECT buyer_id FROM supplier_invitations WHERE supplier_user_id = ? ORDER BY created_at DESC LIMIT 1`, [user.id])
      counterparty = inv.success && (inv.data ?? []).length > 0 ? (inv.data as any[])[0].buyer_id : null
    }

    const result = await executeQuery(
      `
      INSERT INTO agreements (
        user_id, agreement_type, agreement_version, template_id,
        agreement_content, status, presented_at, counterparty_user_id
      ) VALUES (?, ?, ?, ?, ?, 'presented', NOW(), ?)
    `,
      [user.id, agreement_type, templateData.version, templateData.id, templateData.content_template, counterparty],
    )

    const agreementResp = result.success
      ? { agreement_type, status: "presented" as const, presented_at: new Date() }
      : null

    return NextResponse.json({ message: "Agreement created and presented", agreement: agreementResp })
  } catch (error) {
    console.error("Error creating agreement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
