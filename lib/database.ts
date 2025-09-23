// lib/database.ts - COMPLETE FILE WITH ALL FUNCTIONS
import mysql from "mysql2/promise"

// MySQL connection config for local dev
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Transport@2025",
  database: "cash_flow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Database utility function
export async function executeQuery(query: string, params: any[] = []) {
  try {
    const [rows] = await pool.execute(query, params)
    return { success: true, data: rows as any[] }
  } catch (error) {
    console.error("Database query error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown database error" }
  }
}

// User management functions
export async function createUser(email: string, passwordHash: string, role: string) {
  const query = `
    INSERT INTO users (email, password_hash, role)
    VALUES (?, ?, ?)
  `
  const result = await executeQuery(query, [email, passwordHash, role])
  if (!result.success) return result;
  // Fetch the inserted user
  const selectQuery = `SELECT id, email, role, account_status, email_verified, created_at FROM users WHERE email = ? LIMIT 1`;
  const selectResult = await executeQuery(selectQuery, [email]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function getUserByEmail(email: string) {
  const query = `
    SELECT id, email, password_hash, role, account_status, email_verified, 
      failed_login_attempts, lockout_until, last_login
    FROM users 
    WHERE LOWER(email) = LOWER(?)
  `
  const result = await executeQuery(query, [email])
  return result.success ? (result.data ?? [])[0] : null
}

export async function getUserById(id: string) {
  const query = `
    SELECT id, email, role, account_status, email_verified, created_at, last_login
    FROM users 
    WHERE id = ?
  `
  const result = await executeQuery(query, [id])
  return result.success ? (result.data ?? [])[0] : null
}

export async function updateUserEmailVerified(userId: string) {
  const query = `
    UPDATE users 
    SET email_verified = TRUE, account_status = 'active', updated_at = NOW()
    WHERE id = ?
  `
  return executeQuery(query, [userId])
}

export async function updateUserLoginAttempts(email: string, attempts: number, lockoutUntil?: Date | null) {
  const query = `
    UPDATE users 
    SET failed_login_attempts = ?, lockout_until = ?, updated_at = NOW()
  WHERE LOWER(email) = LOWER(?)
  `
  // Normalize undefined to SQL NULL to satisfy mysql2 parameter requirements
  const normalizedLockout = lockoutUntil ?? null
  return executeQuery(query, [attempts, normalizedLockout, email])
}

export async function updateUserLastLogin(userId: string) {
  const query = `
    UPDATE users 
    SET last_login = NOW(), failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW()
    WHERE id = ?
  `
  return executeQuery(query, [userId])
}

// OTP management functions
export async function createOTP(
  userId: string | null,
  email: string,
  otpHash: string,
  purpose: string,
  expiresAt: Date,
) {
  // Normalize email storage to lowercase to avoid case-sensitivity issues
  const normalizedEmail = email.toLowerCase()
  const query = `
    INSERT INTO email_otp_verification (user_id, email_address, otp_code_hash, purpose, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `
  const result = await executeQuery(query, [userId, normalizedEmail, otpHash, purpose, expiresAt])
  if (!result.success) return result;
  // Fetch the inserted OTP
  const selectQuery = `SELECT id FROM email_otp_verification WHERE LOWER(email_address) = LOWER(?) AND purpose = ? ORDER BY created_at DESC LIMIT 1`;
  const selectResult = await executeQuery(selectQuery, [normalizedEmail, purpose]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function getValidOTP(email: string, purpose: string) {
  const query = `
    SELECT id, user_id, otp_code_hash, attempts_count, max_attempts, expires_at
    FROM email_otp_verification
    WHERE LOWER(email_address) = LOWER(?) AND purpose = ? AND verified_at IS NULL AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `
  const result = await executeQuery(query, [email, purpose])
  return result.success ? (result.data ?? [])[0] : null
}

export async function incrementOTPAttempts(otpId: string) {
  const query = `
    UPDATE email_otp_verification 
    SET attempts_count = attempts_count + 1, updated_at = NOW()
    WHERE id = ?
  `
  const result = await executeQuery(query, [otpId]);
  // Fetch updated attempts
  const selectQuery = `SELECT attempts_count, max_attempts FROM email_otp_verification WHERE id = ?`;
  const selectResult = await executeQuery(selectQuery, [otpId]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function markOTPVerified(otpId: string) {
  const query = `
    UPDATE email_otp_verification 
    SET verified_at = NOW(), updated_at = NOW()
    WHERE id = ?
  `
  return executeQuery(query, [otpId])
}

// Helper to detect latest unverified OTP regardless of purpose (to guide clients when purpose mismatches)
export async function getLatestUnverifiedOTP(email: string) {
  const query = `
    SELECT id, purpose, expires_at
    FROM email_otp_verification
    WHERE LOWER(email_address) = LOWER(?) AND verified_at IS NULL AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `
  const result = await executeQuery(query, [email])
  return result.success ? (result.data ?? [])[0] : null
}

// Invitation management functions
export async function createInvitation(
  buyerId: string,
  companyName: string,
  email: string,
  invitationToken: string,
  message?: string,
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const query = `
    INSERT INTO supplier_invitations (
      buyer_id, invited_company_name, invited_email, invitation_message, 
      invitation_token, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `
  const result = await executeQuery(query, [buyerId, companyName, email, message || null, invitationToken, expiresAt])
  if (!result.success) return result;
  // Fetch the inserted invitation
  const selectQuery = `SELECT id, invitation_token, expires_at FROM supplier_invitations WHERE invitation_token = ? LIMIT 1`;
  const selectResult = await executeQuery(selectQuery, [invitationToken]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function getInvitationsByBuyer(buyerId: string, status?: string, limit = 50, offset = 0) {
  let query = `
    SELECT 
      id, invited_company_name, invited_email, invitation_message,
      status, expires_at, sent_at, opened_at, registered_at, completed_at,
      email_delivery_status, supplier_user_id,
      CASE 
        WHEN expires_at < NOW() AND status NOT IN ('completed', 'cancelled') THEN 'expired'
        ELSE status 
      END as current_status
    FROM supplier_invitations 
    WHERE buyer_id = ?
  `

  const params = [buyerId]

  if (status && status !== "all") {
    query += ` AND status = ?`
    params.push(status)
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
  params.push(limit.toString(), offset.toString())

  return executeQuery(query, params)
}

export async function updateInvitationEmailStatus(invitationId: string, status: string) {
  const query = `
    UPDATE supplier_invitations 
    SET email_delivery_status = ?, updated_at = NOW()
    WHERE id = ?
  `
  return executeQuery(query, [status, invitationId])
}

export async function cancelInvitation(invitationId: string, buyerId: string) {
  const query = `
    UPDATE supplier_invitations 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ? AND buyer_id = ? AND status NOT IN ('completed', 'cancelled')
  `
  return executeQuery(query, [invitationId, buyerId])
}

export async function extendInvitationExpiry(invitationId: string, buyerId: string) {
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const query = `
    UPDATE supplier_invitations 
    SET expires_at = ?, status = 'sent', email_delivery_status = 'pending', updated_at = NOW()
    WHERE id = ? AND buyer_id = ?
  `
  return executeQuery(query, [newExpiresAt, invitationId, buyerId])
}

export async function getInvitationByToken(token: string) {
  const query = `
    SELECT id, buyer_id, invited_company_name, invited_email, invitation_message,
           status, expires_at, supplier_user_id
    FROM supplier_invitations
    WHERE invitation_token = ? AND expires_at > NOW()
  `
  const result = await executeQuery(query, [token])
  return result.success ? (result.data ?? [])[0] : null
}

export async function updateInvitationStatus(invitationId: string, status: string, supplierUserId?: string) {
  // Map status to its corresponding timestamp column
  const tsCol =
    status === 'opened'
      ? 'opened_at'
      : status === 'registered'
      ? 'registered_at'
      : status === 'completed'
      ? 'completed_at'
      : status === 'sent'
      ? 'sent_at'
      : null

  const timeSet = tsCol ? `, ${tsCol} = COALESCE(${tsCol}, NOW())` : ''

  const query = supplierUserId
    ? `UPDATE supplier_invitations SET status = ?, supplier_user_id = ?, updated_at = NOW()${timeSet} WHERE id = ?`
    : `UPDATE supplier_invitations SET status = ?, updated_at = NOW()${timeSet} WHERE id = ?`

  const params = supplierUserId ? [status, supplierUserId, invitationId] : [status, invitationId]
  return executeQuery(query, params)
}

// =============================================================================
// NEW DASHBOARD ACCESS AND AGREEMENT FUNCTIONS
// =============================================================================

// Dashboard access and agreement checking functions
export async function getDashboardAccess(userId: string) {
  const query = `
    SELECT access_level, dashboard_features, 
           last_level_change, banking_submission_date, 
           agreement_signing_date, banking_verification_date,
           agreement_id
    FROM dashboard_access 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `
  const result = await executeQuery(query, [userId])
  return result.success ? (result.data ?? [])[0] : null
}

export async function createDashboardAccess(userId: string, kycId: string, accessLevel: string = 'pre_kyc') {
  const query = `
    INSERT INTO dashboard_access (user_id, kyc_id, access_level, dashboard_features)
    VALUES (?, ?, ?, ?)
  `
  const features = JSON.stringify([])
  const result = await executeQuery(query, [userId, kycId, accessLevel, features])
  if (!result.success) return result;
  
  // Return the created access record
  const selectQuery = `SELECT * FROM dashboard_access WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`;
  const selectResult = await executeQuery(selectQuery, [userId]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function updateDashboardAccessLevel(userId: string, accessLevel: string, additionalData: any = {}) {
  let query = `
    UPDATE dashboard_access 
    SET access_level = ?, last_level_change = NOW(), updated_at = NOW()
  `
  const params = [accessLevel]

  if (additionalData.bankingSubmissionDate) {
    query += `, banking_submission_date = ?`
    params.push(additionalData.bankingSubmissionDate)
  }

  if (additionalData.agreementSigningDate) {
    query += `, agreement_signing_date = ?`
    params.push(additionalData.agreementSigningDate)
  }

  if (additionalData.bankingVerificationDate) {
    query += `, banking_verification_date = ?`
    params.push(additionalData.bankingVerificationDate)
  }

  if (additionalData.agreementId) {
    query += `, agreement_id = ?`
    params.push(additionalData.agreementId)
  }

  query += ` WHERE user_id = ?`
  params.push(userId)

  return executeQuery(query, params)
}

// Agreement management functions
export async function getUserAgreements(userId: string, agreementType?: string) {
  let query = `
    SELECT id, agreement_type, agreement_version, status, 
           presented_at, signed_at, signature_method, signatory_name,
           expiry_date, created_at
    FROM agreements 
    WHERE user_id = ?
  `
  const params = [userId]

  if (agreementType) {
    query += ` AND agreement_type = ?`
    params.push(agreementType)
  }

  query += ` ORDER BY created_at DESC`

  const result = await executeQuery(query, params)
  return result.success ? result.data : []
}

export async function getActiveAgreement(userId: string, agreementType: string) {
  const query = `
    SELECT id, agreement_type, status, signed_at, expiry_date
    FROM agreements 
    WHERE user_id = ? AND agreement_type = ? AND status = 'signed'
    AND (expiry_date IS NULL OR expiry_date > NOW())
    ORDER BY signed_at DESC
    LIMIT 1
  `
  const result = await executeQuery(query, [userId, agreementType])
  return result.success ? (result.data ?? [])[0] : null
}

export async function hasSignedRequiredAgreements(userId: string, userRole: string): Promise<boolean> {
  const role = (userRole || '').toLowerCase().trim()

  if (role === 'supplier') {
    // Suppliers must have signed their supplier terms
    const agreement = await getActiveAgreement(userId, 'supplier_terms')
    return !!agreement
  }

  if (role === 'buyer') {
    // Buyers can satisfy the requirement by signing either buyer_terms OR facility_agreement
    const buyerTerms = await getActiveAgreement(userId, 'buyer_terms')
    if (buyerTerms) return true
    const facilityAgreement = await getActiveAgreement(userId, 'facility_agreement')
    return !!facilityAgreement
  }

  // Other roles have no required agreements
  return true
}

export async function createAgreement(
  userId: string,
  agreementType: string,
  agreementVersion: string,
  templateId: string | null,
  agreementContent: string
) {
  const query = `
    INSERT INTO agreements (
      user_id, agreement_type, agreement_version, template_id, 
      agreement_content, status
    )
    VALUES (?, ?, ?, ?, ?, 'pending')
  `
  const result = await executeQuery(query, [
    userId, agreementType, agreementVersion, templateId, agreementContent
  ])
  
  if (!result.success) return result;
  
  // Return the created agreement
  const selectQuery = `
    SELECT * FROM agreements 
    WHERE user_id = ? AND agreement_type = ? 
    ORDER BY created_at DESC LIMIT 1
  `;
  const selectResult = await executeQuery(selectQuery, [userId, agreementType]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function signAgreement(
  agreementId: string,
  signatoryName: string,
  signatoryTitle: string,
  signatureMethod: string = 'digital',
  signatoryIpAddress?: string
) {
  const query = `
    UPDATE agreements 
    SET status = 'signed', signed_at = NOW(), signature_method = ?,
        signatory_name = ?, signatory_title = ?, signatory_ip_address = ?,
        updated_at = NOW()
    WHERE id = ? AND status IN ('pending', 'presented')
  `
  return executeQuery(query, [
    signatureMethod, signatoryName, signatoryTitle, 
    signatoryIpAddress, agreementId
  ])
}

// KYC status checking
export async function getKYCStatus(userId: string) {
  const query = `
    SELECT id, status, submitted_at, reviewed_at, decided_at, decision_notes
    FROM kyc_records 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `
  const result = await executeQuery(query, [userId])
  return result.success ? (result.data ?? [])[0] : null
}

export async function createKYCRecord(userId: string, companyId: string, invitationId?: string) {
  const query = `
    INSERT INTO kyc_records (user_id, company_id, invitation_id, status)
    VALUES (?, ?, ?, 'pending')
  `
  const result = await executeQuery(query, [userId, companyId, invitationId || null])
  
  if (!result.success) return result;
  
  // Return the created KYC record
  const selectQuery = `SELECT * FROM kyc_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`;
  const selectResult = await executeQuery(selectQuery, [userId]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function updateKYCStatus(kycId: string, status: string, reviewerId?: string, decisionNotes?: string) {
  let query = `
    UPDATE kyc_records 
    SET status = ?, updated_at = NOW()
  `
  const params = [status]

  if (status === 'under_review') {
    query += `, reviewed_at = NOW()`
    if (reviewerId) {
      query += `, reviewer_id = ?`
      params.push(reviewerId)
    }
  }

  if (status === 'approved' || status === 'rejected') {
    query += `, decided_at = NOW()`
    if (reviewerId) {
      query += `, reviewer_id = ?`
      params.push(reviewerId)
    }
    if (decisionNotes) {
      query += `, decision_notes = ?`
      params.push(decisionNotes)
    }
  }

  query += ` WHERE id = ?`
  params.push(kycId)

  return executeQuery(query, params)
}

// Banking details status checking
export async function getBankingStatus(userId: string) {
  const query = `
    SELECT id, status, submission_date, verification_date, verification_notes
    FROM banking_details 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `
  const result = await executeQuery(query, [userId])
  return result.success ? (result.data ?? [])[0] : null
}

export async function createBankingDetails(
  userId: string,
  bankName: string,
  accountNumber: string,
  routingNumber: string,
  accountHolderName: string
) {
  const query = `
    INSERT INTO banking_details (
      user_id, bank_name, account_number, routing_number, 
      account_holder_name, status, submission_date
    )
    VALUES (?, ?, ?, ?, ?, 'pending', NOW())
  `
  const result = await executeQuery(query, [
    userId, bankName, accountNumber, routingNumber, accountHolderName
  ])
  
  if (!result.success) return result;
  
  // Return the created banking record
  const selectQuery = `SELECT * FROM banking_details WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`;
  const selectResult = await executeQuery(selectQuery, [userId]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function updateBankingStatus(
  bankingId: string, 
  status: string, 
  adminVerifierId?: string, 
  verificationNotes?: string
) {
  let query = `
    UPDATE banking_details 
    SET status = ?, updated_at = NOW()
  `
  const params = [status]

  if (status === 'verified') {
    query += `, verification_date = NOW()`
    if (adminVerifierId) {
      query += `, admin_verifier_id = ?`
      params.push(adminVerifierId)
    }
    if (verificationNotes) {
      query += `, verification_notes = ?`
      params.push(verificationNotes)
    }
  }

  if (status === 'rejected' || status === 'resubmission_required') {
    if (adminVerifierId) {
      query += `, admin_verifier_id = ?`
      params.push(adminVerifierId)
    }
    if (verificationNotes) {
      query += `, verification_notes = ?`
      params.push(verificationNotes)
    }
    if (status === 'resubmission_required') {
      query += `, resubmission_count = resubmission_count + 1`
    }
  }

  query += ` WHERE id = ?`
  params.push(bankingId)

  return executeQuery(query, params)
}

// Company management functions
export async function createCompany(
  userId: string,
  companyName: string,
  registrationNumber: string,
  taxNumber: string,
  email: string,
  phone: string,
  address: string,
  companyType: string
) {
  const query = `
    INSERT INTO companies (
      user_id, company_name, registration_number, tax_number,
      email, phone, address, company_type, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `
  const result = await executeQuery(query, [
    userId, companyName, registrationNumber, taxNumber,
    email, phone, address, companyType
  ])
  
  if (!result.success) return result;
  
  // Return the created company
  const selectQuery = `SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`;
  const selectResult = await executeQuery(selectQuery, [userId]);
  return selectResult.success ? { success: true, data: selectResult.data } : selectResult;
}

export async function getCompanyByUserId(userId: string) {
  const query = `
    SELECT id, company_name, registration_number, tax_number,
           email, phone, address, company_type, status, created_at
    FROM companies 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `
  const result = await executeQuery(query, [userId])
  return result.success ? (result.data ?? [])[0] : null
}

export async function updateCompanyStatus(companyId: string, status: string) {
  const query = `
    UPDATE companies 
    SET status = ?, updated_at = NOW()
    WHERE id = ?
  `
  return executeQuery(query, [status, companyId])
}

// Agreement template functions
export async function getAgreementTemplate(templateType: string, version?: string) {
  let query = `
    SELECT id, template_name, template_type, version, content_template,
           variables, is_active, effective_date
    FROM agreement_templates 
    WHERE template_type = ? AND is_active = TRUE
  `
  const params = [templateType]

  if (version) {
    query += ` AND version = ?`
    params.push(version)
  }

  query += ` ORDER BY effective_date DESC LIMIT 1`

  const result = await executeQuery(query, params)
  return result.success ? (result.data ?? [])[0] : null
}

export async function getAllAgreementTemplates(templateType?: string) {
  let query = `
    SELECT id, template_name, template_type, version, 
           is_active, effective_date, created_at
    FROM agreement_templates 
  `
  const params: string[] = []

  if (templateType) {
    query += ` WHERE template_type = ?`
    params.push(templateType)
  }

  query += ` ORDER BY template_type, effective_date DESC`

  const result = await executeQuery(query, params)
  return result.success ? result.data : []
}