import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware headers (may be null for unauthenticated users)
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

  const body = await request.json()
  const { companyName, registrationNumber, taxNumber, email, phone, address } = body
  // Accept company type from client for unauthenticated drafts
  const companyTypeFromBody: string | undefined = body.companyType || body.company_type

    // Validate required fields
    if (!companyName || !registrationNumber || !taxNumber || !email) {
      return NextResponse.json(
        {
          error: "Company name, registration number, tax number, and email are required",
        },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 })
    }

    if (userId) {
      // User is authenticated - proceed with normal flow (and claim any draft if exists)
      return await handleAuthenticatedUser(userId, userRole, {
        companyName, registrationNumber, taxNumber, email, phone, address, companyTypeFromBody
      })
    } else {
      // User is not authenticated - save a draft company + KYC (no user linkage)
      return await handleUnauthenticatedDraft({
        companyName, registrationNumber, taxNumber, email, phone, address, companyTypeFromBody
      })
    }

  } catch (error) {
    console.error("Create KYC application error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleAuthenticatedUser(userId: string, userRole: string | null, companyData: any) {
  const { companyName, registrationNumber, taxNumber, email, phone, address, companyTypeFromBody } = companyData
  const companyType = (userRole === "supplier" ? "supplier" : "buyer") as string

  try {
    // Create or update company record
    const existingCompany = await executeQuery(`SELECT id FROM companies WHERE user_id = ? LIMIT 1`, [userId])
    let companyId: string | null = null
    
    if (existingCompany.success && (existingCompany.data ?? []).length > 0) {
      companyId = (existingCompany.data as any[])[0].id
      const updateCompany = await executeQuery(
        `UPDATE companies SET company_name = ?, registration_number = ?, tax_number = ?, email = ?, phone = ?, address = ?, company_type = ?, updated_at = NOW() WHERE id = ?`,
        [companyName, registrationNumber, taxNumber, email, phone, address, companyType, companyId],
      )
      if (!updateCompany.success) {
        return NextResponse.json({ error: "Failed to update company record" }, { status: 500 })
      }
    } else {
      // Try to claim an existing draft by registration number + type (user_id IS NULL)
      const draftType = (companyTypeFromBody && (companyTypeFromBody === 'supplier' || companyTypeFromBody === 'buyer')) ? companyTypeFromBody : companyType
      const draftCheck = await executeQuery(
        `SELECT id FROM companies WHERE registration_number = ? AND company_type = ? AND user_id IS NULL LIMIT 1`,
        [registrationNumber, draftType]
      )
      if (draftCheck.success && (draftCheck.data ?? []).length > 0) {
        companyId = (draftCheck.data as any[])[0].id
        const claim = await executeQuery(
          `UPDATE companies SET user_id = ?, company_name = ?, tax_number = ?, email = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?`,
          [userId, companyName, taxNumber, email, phone, address, companyId]
        )
        if (!claim.success) {
          return NextResponse.json({ error: "Failed to claim existing draft company" }, { status: 500 })
        }
      } else {
      // Check for duplicate registration number for the same company type (unique_company_reg)
      const dupCheck = await executeQuery(
        `SELECT id FROM companies WHERE registration_number = ? AND company_type = ? LIMIT 1`,
        [registrationNumber, draftType]
      )
      if (dupCheck.success && (dupCheck.data ?? []).length > 0) {
        return NextResponse.json({
          error: "A company with this registration number already exists for this company type.",
          code: "DUPLICATE_COMPANY",
          registrationNumber,
          companyType: draftType,
        }, { status: 400 })
      }
      const insertCompany = await executeQuery(
        `INSERT INTO companies (user_id, company_name, registration_number, tax_number, email, phone, address, company_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, companyName, registrationNumber, taxNumber, email, phone, address, draftType],
      )
      if (!insertCompany.success) {
        return NextResponse.json({ error: "Failed to create company record" }, { status: 500 })
      }
      const companyIdSelect = await executeQuery(`SELECT id FROM companies WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId])
      companyId = companyIdSelect.success && (companyIdSelect.data ?? []).length > 0 ? (companyIdSelect.data as any[])[0].id : null
      if (!companyId) {
        return NextResponse.json({ error: "Failed to fetch company id" }, { status: 500 })
      }
      }
    }

    // Create or update KYC record
  // Claim any existing draft KYC for this company
  await executeQuery(`UPDATE kyc_records SET user_id = ? WHERE company_id = (SELECT id FROM companies WHERE registration_number = ? AND company_type = ?) AND user_id IS NULL`, [userId, registrationNumber, companyType])
  const existingKyc = await executeQuery(`SELECT id, status FROM kyc_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId])
    if (existingKyc.success && (existingKyc.data ?? []).length > 0) {
      const current = (existingKyc.data as any[])[0]
      const updateKyc = await executeQuery(
        `UPDATE kyc_records SET company_id = ?, status = CASE WHEN status = 'rejected' THEN 'pending' ELSE status END, updated_at = NOW() WHERE id = ?`,
        [companyId, current.id],
      )
      if (!updateKyc.success) {
        return NextResponse.json({ error: "Failed to update KYC record" }, { status: 500 })
      }
    } else {
      const insertKyc = await executeQuery(`INSERT INTO kyc_records (user_id, company_id, status) VALUES (?, ?, 'pending')`, [userId, companyId])
      if (!insertKyc.success) {
        return NextResponse.json({ error: "Failed to create KYC record" }, { status: 500 })
      }
    }

    // Fetch kyc id and status
    const kycSelect = await executeQuery(`SELECT id, status FROM kyc_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId])
    const kycRecord = kycSelect.success && (kycSelect.data ?? []).length > 0 ? (kycSelect.data as any[])[0] : null
    if (!kycRecord) {
      return NextResponse.json({ error: "Failed to fetch KYC record" }, { status: 500 })
    }

    // Create dashboard access record
    const accessLevel = "pre_kyc"
    const existingDash = await executeQuery(`SELECT id FROM dashboard_access WHERE user_id = ? LIMIT 1`, [userId])
    if (existingDash.success && (existingDash.data ?? []).length > 0) {
      await executeQuery(`UPDATE dashboard_access SET kyc_id = ?, access_level = ?, updated_at = NOW() WHERE user_id = ?`, [kycRecord.id, accessLevel, userId])
    } else {
      await executeQuery(`INSERT INTO dashboard_access (user_id, kyc_id, access_level) VALUES (?, ?, ?)`, [userId, kycRecord.id, accessLevel])
    }

    return NextResponse.json({
      message: "KYC application created successfully",
      kycId: kycRecord.id,
      companyId,
      status: kycRecord.status,
      authenticated: true,
    })
  } catch (error) {
    console.error("Authenticated user KYC error:", error)
    return NextResponse.json({ error: "Failed to process authenticated user request" }, { status: 500 })
  }
}

async function handleUnauthenticatedUser(companyData: any) {
  const { email } = companyData

  try {
    // Check if user already exists with this email
    const existingUser = await executeQuery(`SELECT id, email_verified, account_status FROM users WHERE email = ? LIMIT 1`, [email])
    
    if (existingUser.success && (existingUser.data ?? []).length > 0) {
      const user = (existingUser.data as any[])[0]
      
      if (user.email_verified && user.account_status === 'active') {
        // User exists and is verified - they should log in
        return NextResponse.json({
          error: "An account with this email already exists and is verified. Please log in to continue.",
          shouldLogin: true,
          email: email
        }, { status: 400 })
      } else if (!user.email_verified || user.account_status === 'pending_verification') {
        // User exists but not verified - they should complete registration
        return NextResponse.json({
          error: "An account with this email exists but is not verified. Please check your email for the verification code.",
          shouldVerify: true,
          email: email
        }, { status: 400 })
      }
    }

    // No existing user or user needs to complete registration
    return NextResponse.json({
      message: "Please create an account to save your application data.",
      needsAuthentication: true,
      email: email,
      nextStep: "register",
      // Include the form data in response so frontend can store it temporarily
      formData: companyData
    })
  } catch (error) {
    console.error("Unauthenticated user check error:", error)
    return NextResponse.json({ error: "Failed to verify user status" }, { status: 500 })
  }
}

// New: Save a draft company + KYC when unauthenticated. Drafts have user_id = NULL and can be claimed later after login.
async function handleUnauthenticatedDraft(companyData: any) {
  const { companyName, registrationNumber, taxNumber, email, phone, address, companyTypeFromBody } = companyData

  // Determine draft type: trust client if valid, else default to buyer
  const draftType = (companyTypeFromBody === 'supplier' || companyTypeFromBody === 'buyer') ? companyTypeFromBody : 'buyer'

  try {
    // Do NOT block draft creation based on email existence. Allow saving draft details
    // so the user can proceed with documents, then claim after authentication.

    // If a real company already exists (owned by a user), guide to login to avoid violating unique constraint
    const existingCompanyAny = await executeQuery(
      `SELECT id, user_id FROM companies WHERE registration_number = ? AND company_type = ? LIMIT 1`,
      [registrationNumber, draftType]
    )
  if (existingCompanyAny.success && (existingCompanyAny.data ?? []).length > 0) {
      const row = (existingCompanyAny.data as any[])[0]
      if (row.user_id) {
    return NextResponse.json({ error: "A company with this registration number already exists for this type. Please log in to continue.", shouldLogin: true, email }, { status: 400 })
      }
      // Update existing draft company
      const draftId = row.id
      const upd = await executeQuery(
        `UPDATE companies SET company_name = ?, tax_number = ?, email = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?`,
        [companyName, taxNumber, email, phone, address, draftId]
      )
      if (!upd.success) {
        return NextResponse.json({ error: "Failed to update draft company" }, { status: 500 })
      }
      // Ensure KYC draft exists
      const kycDraftSel = await executeQuery(`SELECT id FROM kyc_records WHERE company_id = ? AND user_id IS NULL LIMIT 1`, [draftId])
      let kycDraftId: string | null = null
      if (kycDraftSel.success && (kycDraftSel.data ?? []).length > 0) {
        kycDraftId = (kycDraftSel.data as any[])[0].id
      } else {
        const kycIns = await executeQuery(`INSERT INTO kyc_records (user_id, company_id, status) VALUES (NULL, ?, 'pending')`, [draftId])
        if (!kycIns.success) {
          return NextResponse.json({ error: "Failed to create draft KYC record" }, { status: 500 })
        }
        const kycSel = await executeQuery(`SELECT id FROM kyc_records WHERE company_id = ? AND user_id IS NULL ORDER BY created_at DESC LIMIT 1`, [draftId])
        kycDraftId = kycSel.success && (kycSel.data ?? []).length > 0 ? (kycSel.data as any[])[0].id : null
      }
      return NextResponse.json({
        message: "Draft saved",
        draft: true,
        authenticated: false,
        companyId: draftId,
        kycId: kycDraftId,
        nextStep: "register",
      })
    }

    // Create new draft company (user_id NULL)
    const ins = await executeQuery(
      `INSERT INTO companies (user_id, company_name, registration_number, tax_number, email, phone, address, company_type) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [companyName, registrationNumber, taxNumber, email, phone, address, draftType]
    )
    if (!ins.success) {
      return NextResponse.json({ error: "Failed to create draft company" }, { status: 500 })
    }
    const compSel = await executeQuery(`SELECT id FROM companies WHERE registration_number = ? AND company_type = ? AND user_id IS NULL ORDER BY created_at DESC LIMIT 1`, [registrationNumber, draftType])
    const draftCompanyId = compSel.success && (compSel.data ?? []).length > 0 ? (compSel.data as any[])[0].id : null
    if (!draftCompanyId) {
      return NextResponse.json({ error: "Failed to fetch draft company id" }, { status: 500 })
    }
    // Create draft KYC
    const kycIns2 = await executeQuery(`INSERT INTO kyc_records (user_id, company_id, status) VALUES (NULL, ?, 'pending')`, [draftCompanyId])
    if (!kycIns2.success) {
      return NextResponse.json({ error: "Failed to create draft KYC record" }, { status: 500 })
    }
    const kycSel2 = await executeQuery(`SELECT id FROM kyc_records WHERE company_id = ? AND user_id IS NULL ORDER BY created_at DESC LIMIT 1`, [draftCompanyId])
    const draftKycId = kycSel2.success && (kycSel2.data ?? []).length > 0 ? (kycSel2.data as any[])[0].id : null

    return NextResponse.json({
      message: "Draft saved",
      draft: true,
      authenticated: false,
      companyId: draftCompanyId,
      kycId: draftKycId,
      nextStep: "register",
    })
  } catch (error) {
    console.error("Unauthenticated draft save error:", error)
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")

    if (!userId) {
  // Public page may probe for existing application; return empty instead of 401
  return NextResponse.json({ application: null })
    }

    // Get KYC record with company info
    const query = `
      SELECT 
        k.id as kyc_id,
        k.status as kyc_status,
        k.submitted_at,
        k.reviewed_at,
        k.decided_at,
        k.decision_notes,
        c.id as company_id,
        c.company_name,
        c.registration_number,
        c.tax_number,
        c.email,
        c.phone,
        c.address,
        c.status as company_status,
        da.access_level,
        da.dashboard_features
      FROM kyc_records k
      LEFT JOIN companies c ON k.company_id = c.id
      LEFT JOIN dashboard_access da ON k.id = da.kyc_id
      WHERE k.user_id = ?
      ORDER BY k.created_at DESC
      LIMIT 1
    `

    const result = await executeQuery(query, [userId])

    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch KYC application" }, { status: 500 })
    }

    const application = result.success && (result.data ?? []).length > 0 ? (result.data as any[])[0] : null

    return NextResponse.json({ application })
  } catch (error) {
    console.error("Get KYC application error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}