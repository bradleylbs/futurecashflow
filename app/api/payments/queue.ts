import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function GET() {
  try {
    // Fetch supplier-accepted offers with banking details from separate banking_details table
    const result = await executeQuery(
      `SELECT 
        epo.id, 
        epo.supplier_user_id AS supplier, 
        epo.buyer_id AS buyer, 
        epo.invoice_number, 
        epo.amount, 
        epo.offered_amount, 
        epo.fee_percent, 
        epo.fee_amount, 
        epo.due_date, 
        epo.status, 
        epo.created_at, 
        epo.accepted_at, 
        epo.vendor_number,
        bd.bank_name,
        bd.account_holder_name,
        bd.account_number,
        bd.routing_number,
        bd.status AS banking_status
       FROM early_payment_offers epo
       JOIN users u ON epo.supplier_user_id = u.id
       LEFT JOIN banking_details bd ON u.id = bd.user_id 
         AND bd.status = 'verified'
       WHERE epo.status IN ('accepted', 'approved', 'executed')
       ORDER BY 
         CASE epo.status 
           WHEN 'accepted' THEN 1 
           WHEN 'approved' THEN 2 
           WHEN 'executed' THEN 3 
         END,
         epo.accepted_at DESC`
    )
    
    if (!result.success) {
      console.error("Database query failed:", result.error)
      return NextResponse.json({ error: "Failed to fetch payment queue" }, { status: 500 })
    }
    
    // Transform data to include banking details as nested object
    const transformedData = Array.isArray(result.data)
      ? result.data.map((row: any) => ({
          id: row.id,
          supplier: row.supplier,
          buyer: row.buyer,
          invoice_number: row.invoice_number,
          amount: row.amount,
          offered_amount: row.offered_amount,
          fee_percent: row.fee_percent,
          fee_amount: row.fee_amount,
          due_date: row.due_date,
          status: row.status,
          created_at: row.created_at,
          accepted_at: row.accepted_at,
          vendor_number: row.vendor_number,
          banking_details: {
            bank_name: row.bank_name,
            account_holder_name: row.account_holder_name,
            account_number: row.account_number,
            routing_number: row.routing_number,
            status: row.banking_status
          }
        }))
      : [];
    
    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("Unexpected error in payment queue:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}