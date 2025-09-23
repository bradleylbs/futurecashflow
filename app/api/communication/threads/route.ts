import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0)

    const q = `
      SELECT 
        t.id, t.buyer_id, t.supplier_id, t.subject, t.last_message_at, t.created_at,
        ub.email AS buyer_email, us.email AS supplier_email
      FROM message_threads t
      JOIN users ub ON ub.id = t.buyer_id
      JOIN users us ON us.id = t.supplier_id
      WHERE t.buyer_id = ? OR t.supplier_id = ?
      ORDER BY COALESCE(t.last_message_at, t.created_at) DESC
      LIMIT ? OFFSET ?
    `
    const res = await executeQuery(q, [user.id, user.id, String(limit), String(offset)])
    if (!res.success) return NextResponse.json({ error: res.error || "Failed to load threads" }, { status: 500 })
    return NextResponse.json({ threads: res.data || [] })
  } catch (e: any) {
    console.error("Threads GET error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const counterpartyId = String(body?.counterpartyId || "").trim()
    const subject = (body?.subject || null) as string | null
    if (!counterpartyId) return NextResponse.json({ error: "counterpartyId required" }, { status: 400 })

    const role = (user.role || "").toLowerCase()
    const buyerId = role === "buyer" ? user.id : counterpartyId
    const supplierId = role === "supplier" ? user.id : counterpartyId

    // Ensure there's a consent relationship (optional guard)
    const consent = await executeQuery(
      `SELECT id FROM vendor_consents WHERE buyer_id = ? AND supplier_user_id = ? AND consent_status = 'consented' LIMIT 1`,
      [buyerId, supplierId]
    )
    if (!consent.success) return NextResponse.json({ error: "Failed to validate relationship" }, { status: 500 })
    if ((consent.data as any[]).length === 0) return NextResponse.json({ error: "No relationship found" }, { status: 400 })

    // Get or create thread
    const existing = await executeQuery(
      `SELECT id FROM message_threads WHERE buyer_id = ? AND supplier_id = ? LIMIT 1`,
      [buyerId, supplierId]
    )
    if (!existing.success) return NextResponse.json({ error: existing.error || "Failed to create thread" }, { status: 500 })

    if ((existing.data as any[]).length > 0) {
      return NextResponse.json({ threadId: (existing.data as any[])[0].id, created: false })
    }

    const ins = await executeQuery(
      `INSERT INTO message_threads (buyer_id, supplier_id, subject, last_message_at) VALUES (?, ?, ?, NULL)`,
      [buyerId, supplierId, subject]
    )
    if (!ins.success) return NextResponse.json({ error: ins.error || "Failed to create thread" }, { status: 500 })
    const row = await executeQuery(
      `SELECT id FROM message_threads WHERE buyer_id = ? AND supplier_id = ? ORDER BY created_at DESC LIMIT 1`,
      [buyerId, supplierId]
    )
    const threadId = row.success && (row.data as any[])?.[0]?.id
    return NextResponse.json({ threadId, created: true })
  } catch (e: any) {
    console.error("Threads POST error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
