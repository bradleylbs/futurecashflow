import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"
import { decryptSensitive } from "@/lib/crypto"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWT(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const details = await executeQuery(
      `SELECT bank_name, account_number, routing_number, account_holder_name FROM banking_details WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
      [user.id]
    )
    if (!details.success || (details.data ?? []).length === 0) {
      return NextResponse.json({ error: "No banking details found" }, { status: 404 })
    }
    const row = (details.data as any[])[0]
    return NextResponse.json({
      bank_name: row.bank_name || "",
      account_number: row.account_number ? decryptSensitive(row.account_number) : "",
      routing_number: row.routing_number ? decryptSensitive(row.routing_number) : "",
      account_holder_name: row.account_holder_name || ""
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
