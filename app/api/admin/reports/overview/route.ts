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

    const [offerKPIs] = (await executeQuery(`SELECT * FROM v_offer_kpis ORDER BY d DESC LIMIT 1`, [])).data as any[]
    const [complianceKPIs] = (await executeQuery(`SELECT * FROM v_compliance_kpis`, [])).data as any[]

    return NextResponse.json({
      offers_accepted: offerKPIs?.accepted_cnt ?? 0,
      fees_total: offerKPIs?.fees_total ?? 0,
      kyc_pending: complianceKPIs?.kyc_pending ?? 0
    })
  } catch (err) {
    console.error("Reports GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
