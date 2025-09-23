import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const threadId = params.id
    // Ensure user is participant
    const can = await executeQuery(
      `SELECT id FROM message_threads WHERE id = ? AND (buyer_id = ? OR supplier_id = ?) LIMIT 1`,
      [threadId, user.id, user.id]
    )
    if (!can.success || (can.data as any[]).length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const res = await executeQuery(
      `SELECT id, sender_id, recipient_id, body, read_at, created_at FROM messages WHERE thread_id = ? ORDER BY created_at ASC`,
      [threadId]
    )
    if (!res.success) return NextResponse.json({ error: res.error || "Failed to load messages" }, { status: 500 })
    return NextResponse.json({ messages: res.data || [] })
  } catch (e: any) {
    console.error("Messages GET error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const threadId = params.id
    const body = await req.json().catch(() => ({}))
    const text = String(body?.body || "").trim()
    if (!text) return NextResponse.json({ error: "body required" }, { status: 400 })

    // Resolve counterparty
    const thr = await executeQuery(
      `SELECT buyer_id, supplier_id FROM message_threads WHERE id = ? LIMIT 1`,
      [threadId]
    )
    if (!thr.success || (thr.data as any[]).length === 0) return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    const { buyer_id, supplier_id } = (thr.data as any[])[0] as { buyer_id: string; supplier_id: string }
    if (user.id !== buyer_id && user.id !== supplier_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const recipient = user.id === buyer_id ? supplier_id : buyer_id

    // Insert message
    const ins = await executeQuery(
      `INSERT INTO messages (thread_id, sender_id, recipient_id, body) VALUES (?, ?, ?, ?)`,
      [threadId, user.id, recipient, text]
    )
    if (!ins.success) return NextResponse.json({ error: ins.error || "Failed to send" }, { status: 500 })

    // Update thread last_message_at
    await executeQuery(`UPDATE message_threads SET last_message_at = NOW() WHERE id = ?`, [threadId])

    return NextResponse.json({ sent: true })
  } catch (e: any) {
    console.error("Messages POST error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
