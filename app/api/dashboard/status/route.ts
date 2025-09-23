import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    // Prefer middleware-injected headers for auth (same pattern as admin routes)
    let userId = request.headers.get("x-user-id")
    let userEmail = request.headers.get("x-user-email") || undefined
    let userRole = request.headers.get("x-user-role") || undefined

    if (!userId || !userRole) {
      const verified = await verifyJWT(request as unknown as Request)
      if (verified) {
        userId = verified.id
        userEmail = verified.email
        userRole = verified.role
      }
    }

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's dashboard access level and KYC status
    const dashboardData = await executeQuery(
      `
      SELECT 
        -- Latest dashboard access details
        (SELECT access_level FROM dashboard_access WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS access_level,
        (SELECT dashboard_features FROM dashboard_access WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS dashboard_features,
        (SELECT banking_submission_date FROM dashboard_access WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS banking_submission_date,
        (SELECT agreement_signing_date FROM dashboard_access WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS agreement_signing_date,
        (SELECT banking_verification_date FROM dashboard_access WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS banking_verification_date,
        -- KYC and company info
        kr.status AS kyc_status,
        kr.submitted_at,
        kr.decided_at,
        c.company_name,
        c.company_type,
        -- Latest agreement and banking statuses
        (SELECT status FROM agreements WHERE user_id = u.id AND status IN ('presented','signed') ORDER BY created_at DESC LIMIT 1) AS agreement_status,
        (SELECT status FROM banking_details WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS banking_status
      FROM users u
      LEFT JOIN kyc_records kr ON u.id = kr.user_id
      LEFT JOIN companies c ON u.id = c.user_id
      WHERE u.id = ?
      LIMIT 1
    `,
      [userId],
    )

  const userData = dashboardData.success && (dashboardData.data ?? []).length > 0 ? (dashboardData.data as any[])[0] : {}

    // Get document counts for progress tracking
  const documentStats = await executeQuery(
      `
      SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN d.status = 'verified' THEN 1 ELSE 0 END) as verified_documents,
        SUM(CASE WHEN d.status = 'rejected' THEN 1 ELSE 0 END) as rejected_documents
      FROM documents d
      JOIN kyc_records kr ON d.kyc_id = kr.id
      WHERE kr.user_id = ?
    `,
      [userId],
    )

    const docStats =
      documentStats.success && (documentStats.data ?? []).length > 0
        ? ((documentStats.data as any[])[0] as any)
        : { total_documents: 0, verified_documents: 0, rejected_documents: 0 }

    // Get invitation data for suppliers
    let invitationData = null
    if ((userRole || "").toLowerCase() === "supplier") {
      const invitation = await executeQuery(
        `
        SELECT 
          si.invited_company_name,
          si.invitation_message,
          si.sent_at,
          u_buyer.email as buyer_email,
          c_buyer.company_name as buyer_company_name
        FROM supplier_invitations si
        JOIN users u_buyer ON si.buyer_id = u_buyer.id
        LEFT JOIN companies c_buyer ON u_buyer.id = c_buyer.user_id
        WHERE si.supplier_user_id = ?
        ORDER BY si.created_at DESC
        LIMIT 1
      `,
        [userId],
      )

  invitationData = invitation.success && (invitation.data ?? []).length > 0 ? (invitation.data as any[])[0] : null
    }

    return NextResponse.json({
      user: {
        id: userId,
        email: userEmail,
        role: userRole,
      },
      dashboard: {
        access_level: userData.access_level || "pre_kyc",
        features: userData.dashboard_features || [],
        kyc_status: userData.kyc_status || "pending",
        company_name: userData.company_name,
        company_type: userData.company_type,
        agreement_status: userData.agreement_status,
        banking_status: userData.banking_status,
        submitted_at: userData.submitted_at,
        decided_at: userData.decided_at,
        banking_submission_date: userData.banking_submission_date,
        agreement_signing_date: userData.agreement_signing_date,
        banking_verification_date: userData.banking_verification_date,
      },
      documents: docStats,
      invitation: invitationData,
    })
  } catch (error) {
    console.error("Error fetching dashboard status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
