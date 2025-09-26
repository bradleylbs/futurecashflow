import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get("x-user-id")
    let userRole = request.headers.get("x-user-role")

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
    const q = searchParams.get("q") || ""
    const action = searchParams.get("action") || ""
    const actor = searchParams.get("actor") || ""
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = `
      SELECT id, action, target_type, target_id, metadata, ip_address, user_agent,
             created_at, actor_email, actor_user_id
      FROM v_admin_audit_log
      WHERE 1=1
    `
    const params: any[] = []

    if (q) {
      query += ` AND (action LIKE ? OR target_type LIKE ? OR actor_email LIKE ?)`
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }
    if (action) {
      query += ` AND action = ?`
      params.push(action)
    }
    if (actor) {
      query += ` AND actor_user_id = ?`
      params.push(actor)
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`

    const result = await executeQuery(query, params)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch audit logs", details: (result as any).error }, { status: 500 })
    }

    return NextResponse.json({
      logs: result.data,
      pagination: { limit, offset, hasMore: (result.data as any[]).length === limit },
    })
  } catch (error) {
    console.error("Get audit logs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
