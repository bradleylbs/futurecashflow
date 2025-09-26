import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { verifyJWT } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { rule, entityId, justification } = body

    const insert = await executeQuery(`
      INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata, created_at)
      VALUES (?, 'RISK_OVERRIDE', 'risk', ?, JSON_OBJECT('rule', ?, 'justification', ?), NOW())
    `, [userId, entityId, rule, justification])

    if (!insert.success) {
      return NextResponse.json({ error: "Failed to log override", details: (insert as any).error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Post risk override error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
