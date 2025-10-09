import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request)
    if (!user || user.role !== 'buyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const rows = Array.isArray(body?.rows) ? body.rows : []

    // Basic server-side validation and gating: consent should be enforced on backend when integrated.
    const total = rows.length
    const vendors = Array.from(new Set(rows.map((r: any) => r.vendor_number).filter(Boolean)))
    const validRows: any[] = []
    const invalidRows: any[] = []

    // Load consented vendors for server-side enforcement
    const consentRes = await executeQuery(
      `SELECT vendor_number FROM vendor_consents WHERE buyer_id = ? AND consent_status = 'consented'`,
      [user.id]
    )
    const consentedSet = new Set<string>(consentRes.success ? (consentRes.data as any[]).map(r => r.vendor_number) : [])

    for (const r of rows) {
      // Use the 'reference' field from frontend parsing as invoice_number
      const invoice_number = r.reference || null;
      
      // If invoice_number is missing, mark as invalid and skip insert
      if (!invoice_number) {
        invalidRows.push({ ...r, error: 'missing_invoice_number' });
        continue;
      }

      // Convert amount to number and validate
      const amount = parseFloat(r.amount_in_document_currency) || 0;
      
      // Validate required fields
      const ok = r.vendor_number && invoice_number && amount > 0 && /\d{4}-\d{2}-\d{2}/.test(r.net_due_date);
      const consentOk = consentedSet.size === 0 || consentedSet.has(r.vendor_number);
      
      if (ok && consentOk) {
        validRows.push({
          ...r,
          invoice_number,
          amount
        });
      } else {
        invalidRows.push({ 
          ...r, 
          error: !ok ? 'validation_failed' : 'vendor_not_consented' 
        });
      }
    }

    const valid = validRows.length
    const invalid = invalidRows.length

    // Create batch
    const batchInsert = await executeQuery(
      `INSERT INTO ap_batches (buyer_id, uploaded_by, total_rows, valid_rows, invalid_rows, vendor_count, status) VALUES (?, ?, ?, ?, ?, ?, 'received')`,
      [user.id, user.id, total, valid, invalid, vendors.length]
    )
    if (!batchInsert.success) {
      return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
    }
    const batchRow = await executeQuery(`SELECT id FROM ap_batches WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 1`, [user.id])
    const batchId = batchRow.success && (batchRow.data as any[])?.[0]?.id

    // Insert valid rows
    for (const r of validRows) {
      await executeQuery(
        `INSERT INTO ap_batch_rows (batch_id, buyer_id, vendor_number, invoice_number, amount, due_date, status) VALUES (?, ?, ?, ?, ?, ?, 'accepted')`,
        [batchId, user.id, r.vendor_number, r.invoice_number, r.amount, r.net_due_date] // Using net_due_date as due_date
      )
    }

    // Insert invalid rows
    for (const r of invalidRows) {
      await executeQuery(
        `INSERT INTO ap_batch_rows (batch_id, buyer_id, vendor_number, invoice_number, amount, due_date, status, validation_error) VALUES (?, ?, ?, ?, ?, ?, 'rejected', ?)`,
        [
          batchId, 
          user.id, 
          r.vendor_number || null, 
          r.reference || null, // Use reference field for invoice_number
          parseFloat(r.amount_in_document_currency) || 0, 
          r.net_due_date || null, // Using net_due_date as due_date
          r.error
        ]
      )
    }

    // Audit event
    await executeQuery(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata) VALUES (?, 'ap_upload', 'ap_batch', ?, JSON_OBJECT('total', ?, 'valid', ?, 'invalid', ?, 'vendors', ?))`,
      [user.id, batchId, total, valid, invalid, JSON.stringify(vendors)]
    )

    return NextResponse.json({
      summary: { batchId, total, valid, invalid, vendors }
    })
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}