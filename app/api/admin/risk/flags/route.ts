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
    const rule = searchParams.get("rule")

    let query = `SELECT * FROM v_risk_flags WHERE 1=1`
    const params: any[] = []
    if (rule && rule !== "all") {
      query += ` AND rule = ?`
      params.push(rule)
    }
    query += ` ORDER BY cnt DESC`

    const result = await executeQuery(query, params)
    return NextResponse.json({ items: result.data })
  } catch (error) {
    console.error("Get risk flags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
