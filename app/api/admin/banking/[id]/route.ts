import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { decryptSensitive } from "@/lib/crypto"

// Securely fetch full banking details for a specific record (admin only)
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || !["admin", "fm_admin", "fa_admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

  const bankingId = id
    const result = await executeQuery(
      `SELECT id as banking_id, user_id, bank_name, account_number, routing_number, account_holder_name, status, submission_date, verification_date, verification_notes
       FROM banking_details WHERE id = ? LIMIT 1`,
      [bankingId]
    )

    if (!result.success || (result.data ?? []).length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const row: any = (result.data as any[])[0]

    let account_number_full: string | null = null
    let routing_number_full: string | null = null
    try { account_number_full = row.account_number ? decryptSensitive(row.account_number) : null } catch { account_number_full = null }
    try { routing_number_full = row.routing_number ? decryptSensitive(row.routing_number) : null } catch { routing_number_full = null }

    // Remove encrypted values from output
    delete row.account_number
    delete row.routing_number

    return NextResponse.json({ banking: { ...row, account_number_full, routing_number_full } })
  } catch (error) {
    console.error("Admin get banking by id error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
