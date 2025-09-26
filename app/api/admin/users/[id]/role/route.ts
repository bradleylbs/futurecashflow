import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export const runtime = "nodejs"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { role } = await request.json()
    const result = await executeQuery(`UPDATE users SET role=? WHERE id=?`, [role, params.id])

    return NextResponse.json({ success: result.success })
  } catch (err) {
    console.error("Role update error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
