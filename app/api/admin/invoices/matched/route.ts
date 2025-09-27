
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  // Real matched invoices: join payments, ap_batch_rows, buyer_supplier_links, users
  const query = `
    SELECT
      p.id,
      r.invoice_number,
      u.email AS supplier_name,
      r.amount,
      p.status,
      p.updated_at AS matched_at
    FROM payments p
    INNER JOIN ap_batch_rows r ON p.invoice_row_id = r.id
    INNER JOIN buyer_supplier_links bsl ON p.buyer_id = bsl.buyer_id AND p.supplier_user_id = bsl.supplier_user_id
    INNER JOIN users u ON p.supplier_user_id = u.id
    WHERE p.status = 'paid'
    ORDER BY p.updated_at DESC
    LIMIT 100
  `;
  const result = await executeQuery(query);
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to fetch matched invoices" }, { status: 500 });
  }
  // Format supplier_name if you want company name, join with companies table if needed
  return NextResponse.json({ invoices: result.data });
}
