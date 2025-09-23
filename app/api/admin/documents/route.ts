import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware headers
    let userId = request.headers.get("x-user-id")
    let userRole = (request.headers.get("x-user-role") || "").toLowerCase()
    if (!userId || !userRole) {
      const user = await verifyJWT(request as unknown as Request)
      userId = user?.id || null
      userRole = (user?.role || "").toLowerCase()
    }
    if (!userId || !["admin", "fm_admin", "fa_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const documentType = searchParams.get("documentType")
    const kycId = searchParams.get("kycId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Build query for reviewable documents
    let query = `
      SELECT 
        d.id as document_id,
        d.document_type,
        d.filename,
        d.file_size,
        d.mime_type,
        d.status as document_status,
        d.upload_date,
        d.review_date,
        d.review_notes,
        d.version,
        k.id as kyc_id,
        k.status as kyc_status,
        u.id as user_id,
        u.email,
        u.role as user_role,
        c.company_name,
        c.company_type,
        si.invited_company_name,
        si.status as invitation_status
      FROM documents d
      JOIN kyc_records k ON d.kyc_id = k.id
      JOIN users u ON k.user_id = u.id
      LEFT JOIN companies c ON k.company_id = c.id
      LEFT JOIN supplier_invitations si ON k.invitation_id = si.id
      WHERE d.replaced_by IS NULL
    `

    const params: any[] = []

    if (status && status !== "all") {
      query += ` AND d.status = ?`
      params.push(status)
    }

    if (documentType && documentType !== "all") {
      query += ` AND d.document_type = ?`
      params.push(documentType)
    }

    if (kycId) {
      query += ` AND k.id = ?`
      params.push(kycId)
    }

    query += `
      ORDER BY 
        CASE 
          WHEN d.status = 'pending' THEN 1
          WHEN d.status = 'under_review' THEN 2
          ELSE 3
        END,
        d.upload_date DESC
    `
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 500 ? limit : 50
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0
    query += ` LIMIT ${safeLimit} OFFSET ${safeOffset} `

    const result = await executeQuery(query, params)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch documents", details: (result as any).error }, { status: 500 })
    }

    return NextResponse.json({
      documents: result.success ? result.data : [],
      pagination: {
  total: result.success ? (result.data as any[]).length : 0,
        limit,
        offset,
  hasMore: result.success ? ((result.data as any[]).length === limit) : false,
      },
    })
  } catch (error) {
    console.error("Get admin documents error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
