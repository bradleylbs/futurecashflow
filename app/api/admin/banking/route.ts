import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { maskValue, decryptSensitive } from "@/lib/crypto"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || !["admin", "fm_admin", "fa_admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status") || "pending"

    let where = ""
    const params: any[] = []
    if (status !== "all") {
      where = "WHERE bd.status = ?"
      params.push(status)
    }

    const query = `
      SELECT 
        bd.id as banking_id,
        bd.user_id,
        u.email,
        c.company_name,
        bd.bank_name,
        bd.account_holder_name,
        bd.account_number,
        bd.routing_number,
        bd.status,
        bd.submission_date,
        bd.verification_date,
        bd.verification_notes
      FROM banking_details bd
      JOIN users u ON bd.user_id = u.id
      LEFT JOIN companies c ON u.id = c.user_id
      ${where}
      ORDER BY bd.submission_date DESC
      LIMIT 200
    `

    const result = await executeQuery(query, params)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch banking submissions" }, { status: 500 })
    }

    const rows = (result.data as any[]) || []
    const sanitized = rows.map((r) => {
      let acctMasked: string | undefined
      let routingMasked: string | undefined
      try {
        if (r.account_number) {
          const plain = decryptSensitive(r.account_number)
          acctMasked = maskValue(plain)
        }
        if (r.routing_number) {
          const plain = decryptSensitive(r.routing_number)
          routingMasked = maskValue(plain)
        }
      } catch (e) {
        // If decryption fails (e.g., missing key), leave masked values undefined
      }
      // Exclude raw encrypted fields from response
      const { account_number, routing_number, ...rest } = r
      return {
        ...rest,
        account_number_masked: acctMasked,
        routing_number_masked: routingMasked,
      }
    })
    return NextResponse.json({ banking: sanitized })
  } catch (error) {
    console.error("Get banking admin list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
