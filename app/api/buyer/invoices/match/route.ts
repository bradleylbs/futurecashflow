import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { executeQuery } from "@/lib/database";

export const runtime = "nodejs";

// POST /api/buyer/invoices/match
export async function POST(req: NextRequest) {
  try {
    const user = await verifyJWT(req as unknown as Request);
    if (!user || user.role !== "buyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find unmatched invoices (no supplier_user_id linked)
    const unmatchedRes = await executeQuery(
      `SELECT r.id, r.vendor_number, r.invoice_number
       FROM ap_batch_rows r
       JOIN vendor_consents vc
         ON r.buyer_id = vc.buyer_id
         AND r.vendor_number = vc.vendor_number
       WHERE r.buyer_id = ?
         AND r.status = 'accepted'
         AND vc.consent_status = 'consented'
         AND vc.supplier_user_id IS NOT NULL
         AND (
           r.id NOT IN (
             SELECT invoice_row_id FROM payments WHERE buyer_id = ?
           )
         )`,
      [user.id, user.id]
    );
    if (!unmatchedRes.success) {
      return NextResponse.json({ error: unmatchedRes.error || "Failed to query invoices" }, { status: 500 });
    }
    const unmatched = unmatchedRes.data as any[];
    let matchCount = 0;
    for (const row of unmatched) {
      // Find supplier_user_id for vendor_number
      const supplierRes = await executeQuery(
        `SELECT supplier_user_id FROM vendor_consents WHERE buyer_id = ? AND vendor_number = ? AND consent_status = 'consented' ORDER BY updated_at DESC LIMIT 1`,
        [user.id, row.vendor_number]
      );
      const supplierId = supplierRes.success && (supplierRes.data?.[0]?.supplier_user_id ?? null);
      if (supplierId) {
        // Update invoice row with supplier_user_id
        const updateRes = await executeQuery(
          `UPDATE ap_batch_rows SET supplier_user_id = ? WHERE id = ?`,
          [supplierId, row.id]
        );
        if (updateRes.success) matchCount++;
      }
    }
    // Optionally log audit event
    await executeQuery(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata) VALUES (?, 'auto_match_invoices', 'buyer', ?, JSON_OBJECT('matched', ?))`,
      [user.id, user.id, matchCount]
    );
    return NextResponse.json({ matched: matchCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Match failed" }, { status: 500 });
  }
}
