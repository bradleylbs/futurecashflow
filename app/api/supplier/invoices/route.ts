import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role.toLowerCase() !== "supplier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0)

    // Fetch invoices for this supplier using consented vendor numbers
    // Use EXISTS to avoid row multiplication when duplicate consent records exist
    const q = `
      SELECT 
        r.id,
        r.invoice_number,
        r.vendor_number,
        r.amount,
        r.due_date,
        r.status,
        r.created_at,
        b.created_at as batch_created_at,
        u.email as buyer_email,
        u.id as buyer_id
      FROM ap_batch_rows r
      JOIN ap_batches b ON b.id = r.batch_id
      JOIN users u ON u.id = r.buyer_id
      WHERE r.status = 'accepted'
        AND EXISTS (
          SELECT 1 FROM vendor_consents vc
          WHERE vc.buyer_id = r.buyer_id
            AND vc.vendor_number = r.vendor_number
            AND vc.supplier_user_id = ?
            AND vc.consent_status = 'consented'
        )
        AND NOT EXISTS (
          SELECT 1 FROM ap_batch_rows r2
          WHERE r2.buyer_id = r.buyer_id
            AND r2.vendor_number = r.vendor_number
            AND r2.invoice_number = r.invoice_number
            AND r2.status = 'accepted'
            AND (
              r2.created_at > r.created_at OR
              (r2.created_at = r.created_at AND r2.id > r.id)
            )
        )
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    const res = await executeQuery(q, [user.id, String(limit), String(offset)])
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to load invoices" }, { status: 500 })
    }

    return NextResponse.json({ invoices: res.data || [] })
  } catch (e: any) {
    console.error("Supplier invoices error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
