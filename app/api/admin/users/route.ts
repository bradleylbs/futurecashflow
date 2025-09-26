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
      if (user) { userId = user.id; userRole = user.role }
    }

    const normalizedRole = (userRole || "").toLowerCase()
    if (!userId || !["admin", "fm_admin", "fa_admin"].includes(normalizedRole)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const q = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = `SELECT id, email, role, account_status, created_at FROM users WHERE 1=1`
    const params: any[] = []

    if (role && role !== "all") { query += ` AND role = ?`; params.push(role) }
    if (q) { query += ` AND email LIKE ?`; params.push(`%${q}%`) }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    const result = await executeQuery(query, params)

    return NextResponse.json({
      users: result.success ? result.data : [],
      pagination: { limit, offset, hasMore: (result.data as any[]).length === limit }
    })
  } catch (err) {
    console.error("Users GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
