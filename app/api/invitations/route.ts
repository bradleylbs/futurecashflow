import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || userRole !== "buyer") {
      return NextResponse.json({ error: "Unauthorized. Only buyers can view invitations." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Build query with optional status filter
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

    const params = [userId]

    if (status && status !== "all") {
      query += ` AND status = ?`
      params.push(status)
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(limit.toString(), offset.toString())

    const result = await executeQuery(query, params)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM supplier_invitations WHERE buyer_id = ?`
    const countParams = [userId]

    if (status && status !== "all") {
      countQuery += ` AND status = ?`
      countParams.push(status)
    }

    const countResult = await executeQuery(countQuery, countParams)
    const total = countResult.success ? Number.parseInt(((countResult.data as any[])[0]?.total ?? "0") as string) : 0

    return NextResponse.json({
      invitations: result.success ? result.data : [],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Get invitations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
