import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
  const user = await verifyJWT(req as unknown as Request)
  if (!user || user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  // Fetch consented vendors for this buyer
  const q = `SELECT vendor_number FROM vendor_consents WHERE buyer_id = ? AND consent_status = 'consented'`
  const res = await executeQuery(q, [user.id])
  const vendors = res.success ? (res.data as any[]).map(r => r.vendor_number) : []
  return NextResponse.json({ vendors })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load vendors' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as any
    let vendorsInput: any[] = []
    if (Array.isArray(body?.vendors)) {
      vendorsInput = body.vendors
    } else if (Array.isArray(body?.vendor_numbers)) {
      const supplier_user_id = body?.supplier_user_id
      const supplier_email = body?.supplier_email
      vendorsInput = body.vendor_numbers.map((vn: any) => ({ vendor_number: String(vn), supplier_email, supplier_user_id }))
    } else if (body?.vendor_number) {
      vendorsInput = [{ vendor_number: String(body.vendor_number), supplier_email: body?.supplier_email, supplier_user_id: body?.supplier_user_id }]
    }
    if (vendorsInput.length === 0) {
      return NextResponse.json({ error: 'No vendors provided' }, { status: 400 })
    }

  const toUpsert: Array<{ vendor_number: string; supplier_user_id: string | null }> = []

    for (const v of vendorsInput) {
      const vendor_number = String(v?.vendor_number || '').trim()
      if (!vendor_number) continue
      let supplier_user_id: string | null = null
      // Prefer explicit supplier_user_id when provided
      if (v?.supplier_user_id) {
        supplier_user_id = String(v.supplier_user_id)
      } else {
        const supplier_email = (v?.supplier_email ? String(v.supplier_email) : '').trim()
        if (supplier_email) {
          const q = await executeQuery(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [supplier_email])
          if (q.success && (q.data as any[])?.[0]?.id) supplier_user_id = (q.data as any[])![0].id as string
        }
      }
      toUpsert.push({ vendor_number, supplier_user_id })
    }

    if (toUpsert.length === 0) return NextResponse.json({ error: 'No valid vendor numbers' }, { status: 400 })

    // Upsert vendor consents
    for (const item of toUpsert) {
      // INSERT with ON DUPLICATE KEY: uniq (buyer_id, vendor_number)
      const res = await executeQuery(
        `INSERT INTO vendor_consents (buyer_id, vendor_number, supplier_user_id, consent_status, consented_at, source)
         VALUES (?, ?, ?, 'consented', NOW(), 'manual')
         ON DUPLICATE KEY UPDATE consent_status = 'consented', consented_at = NOW(), supplier_user_id = VALUES(supplier_user_id), updated_at = NOW()`,
        [user.id, item.vendor_number, item.supplier_user_id]
      )
      if (!res.success) return NextResponse.json({ error: res.error || 'Failed to upsert' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: toUpsert.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save vendors' }, { status: 500 })
  }
}
