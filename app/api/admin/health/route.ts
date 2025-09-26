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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const result = await executeQuery(`SELECT * FROM v_system_health`, [])
    return NextResponse.json(
      result.success && Array.isArray(result.data) && result.data.length > 0
        ? result.data[0]
        : {}
    )
  } catch (err) {
    console.error("Health GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
