import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware headers
    let userId = request.headers.get("x-user-id")
    let userRole = request.headers.get("x-user-role")

    // Fallback to cookie verification if middleware headers are missing
    if (!userId || !userRole) {
      const user = await verifyJWT(request as unknown as Request)
      if (user) {
        userId = user.id
        userRole = user.role
      }
    }

  const normalizedRole = (userRole || "").toLowerCase()
  if (!userId || !["admin", "fm_admin", "fa_admin"].includes(normalizedRole)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const kycId = searchParams.get("kycId")
    const userType = searchParams.get("userType") // supplier, buyer
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Build query with filters (MySQL-compatible, ONLY_FULL_GROUP_BY safe)
    let query = `
      SELECT 
        k.id as kyc_id,
        k.status as kyc_status,
        k.submitted_at,
        k.reviewed_at,
        k.decided_at,
        k.decision_notes,
        u.id as user_id,
        u.email as email,
        u.role as user_role,
        u.created_at as user_created_at,
        c.company_name as company_name,
        COALESCE(NULLIF(c.registration_number, ''), (
          SELECT registration_number FROM companies WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1
        )) as registration_number,
        COALESCE(NULLIF(c.tax_number, ''), (
          SELECT tax_number FROM companies WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1
        )) as tax_number,
        COALESCE(NULLIF(c.email, ''), (
          SELECT email FROM companies WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1
        )) as company_email,
        COALESCE(NULLIF(c.phone, ''), (
          SELECT phone FROM companies WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1
        )) as company_phone,
        COALESCE(NULLIF(c.address, ''), (
          SELECT address FROM companies WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1
        )) as company_address,
        c.company_type as company_type,
        si.invited_company_name as invited_company_name,
        si.status as invitation_status,
        COALESCE(ds.document_count, 0) as document_count,
        COALESCE(ds.verified_documents, 0) as verified_documents,
        COALESCE(ds.rejected_documents, 0) as rejected_documents,
        COALESCE(ds.pending_documents, 0) as pending_documents
      FROM kyc_records k
      JOIN users u ON k.user_id = u.id
      LEFT JOIN companies c ON k.company_id = c.id
      LEFT JOIN supplier_invitations si ON k.invitation_id = si.id
      LEFT JOIN (
        SELECT 
          kyc_id,
          COUNT(DISTINCT document_type) as document_count,
          COUNT(DISTINCT CASE WHEN status = 'verified' THEN document_type END) as verified_documents,
          COUNT(DISTINCT CASE WHEN status = 'rejected' THEN document_type END) as rejected_documents,
          COUNT(DISTINCT CASE WHEN status IN ('pending', 'under_review') THEN document_type END) as pending_documents
        FROM documents
        WHERE replaced_by IS NULL
        GROUP BY kyc_id
      ) ds ON ds.kyc_id = k.id
      WHERE 1=1
    `

    const params: any[] = []

    if (status && status !== "all") {
      query += ` AND k.status = ?`
      params.push(status)
    }

    if (kycId) {
      query += ` AND k.id = ?`
      params.push(kycId)
    }

    if (userType && userType !== "all") {
      query += ` AND u.role = ?`
      params.push(userType)
    }

    query += `
      ORDER BY 
        CASE 
          WHEN k.status = 'under_review' THEN 1
          WHEN k.status = 'ready_for_decision' THEN 2
          WHEN k.status = 'pending' THEN 3
          ELSE 4
        END,
        (k.submitted_at IS NULL) ASC,
        k.submitted_at DESC,
        k.created_at DESC
    `
    // MySQL can reject bound parameters for LIMIT/OFFSET in some configurations; inline safe numbers
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 500 ? limit : 50
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0
    query += ` LIMIT ${safeLimit} OFFSET ${safeOffset} `

    const result = await executeQuery(query, params)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch applications", details: (result as any).error }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT k.id) as total 
      FROM kyc_records k
      JOIN users u ON k.user_id = u.id
      WHERE 1=1
    `
    const countParams: any[] = []

    if (status && status !== "all") {
      countQuery += ` AND k.status = ?`
      countParams.push(status)
    }

    if (kycId) {
      countQuery += ` AND k.id = ?`
      countParams.push(kycId)
    }

    if (userType && userType !== "all") {
      countQuery += ` AND u.role = ?`
      countParams.push(userType)
    }

    const countResult = await executeQuery(countQuery, countParams)
  const total = countResult.success ? Number.parseInt(((countResult.data as any[])[0]?.total ?? "0") as string) : 0

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN k.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN k.status = 'under_review' THEN 1 END) as under_review,
        COUNT(CASE WHEN k.status = 'ready_for_decision' THEN 1 END) as ready_for_decision,
        COUNT(CASE WHEN k.status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN k.status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN u.role = 'supplier' THEN 1 END) as suppliers,
        COUNT(CASE WHEN u.role = 'buyer' THEN 1 END) as buyers
      FROM kyc_records k
      JOIN users u ON k.user_id = u.id
    `

    const statsResult = await executeQuery(statsQuery, [])
  const stats = statsResult.success ? (statsResult.data as any[])[0] : {}

    return NextResponse.json({
      applications: result.data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats,
    })
  } catch (error) {
    console.error("Get admin applications error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
