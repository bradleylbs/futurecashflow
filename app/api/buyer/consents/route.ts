import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { executeQuery } from '@/lib/database'

export const runtime = 'nodejs'

// Utility endpoint for buyers to create/patch vendor consent mappings
export async function POST(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as any

    // Support multiple shapes:
    // 1) { vendor_number, supplier_user_id | supplier_email }
    // 2) { vendor_numbers: [..], supplier_user_id | supplier_email }
    // 3) { vendors: [{ vendor_number, supplier_user_id | supplier_email }, ...] }
    const entries: Array<{ vendor_number: string; supplier_user_id?: string | null; supplier_email?: string | null }> = []

    if (Array.isArray(body?.vendors)) {
      for (const v of body.vendors) {
        const vendor_number = String(v?.vendor_number || '').trim()
        if (!vendor_number) continue
        const supplier_user_id = v?.supplier_user_id ? String(v.supplier_user_id) : undefined
        const supplier_email = v?.supplier_email ? String(v.supplier_email).trim() : undefined
        entries.push({ vendor_number, supplier_user_id, supplier_email })
      }
    } else if (Array.isArray(body?.vendor_numbers)) {
      const supplier_user_id = body?.supplier_user_id ? String(body.supplier_user_id) : undefined
      const supplier_email = body?.supplier_email ? String(body.supplier_email).trim() : undefined
      for (const vn of body.vendor_numbers) {
        const vendor_number = String(vn || '').trim()
        if (!vendor_number) continue
        entries.push({ vendor_number, supplier_user_id, supplier_email })
      }
    } else if (body?.vendor_number) {
      const vendor_number = String(body.vendor_number).trim()
      const supplier_user_id = body?.supplier_user_id ? String(body.supplier_user_id) : undefined
      const supplier_email = body?.supplier_email ? String(body.supplier_email).trim() : undefined
      if (vendor_number) entries.push({ vendor_number, supplier_user_id, supplier_email })
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No vendor numbers provided' }, { status: 400 })
    }

    // Upsert all entries
    for (const e of entries) {
      let supplierId: string | null = e.supplier_user_id ? String(e.supplier_user_id) : null
      if (!supplierId && e.supplier_email) {
        const q = await executeQuery(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [e.supplier_email])
        if (q.success && (q.data as any[])?.[0]?.id) supplierId = (q.data as any[])![0].id as string
      }

      const res = await executeQuery(
        `INSERT INTO vendor_consents (buyer_id, vendor_number, supplier_user_id, consent_status, consented_at, source)
         VALUES (?, ?, ?, 'consented', NOW(), 'manual')
         ON DUPLICATE KEY UPDATE consent_status = 'consented', consented_at = NOW(), supplier_user_id = VALUES(supplier_user_id), updated_at = NOW()`,
        [user.id, e.vendor_number, supplierId]
      )
      if (!res.success) return NextResponse.json({ error: res.error || 'Failed to save consent' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: entries.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save consent' }, { status: 500 })
  }
}
