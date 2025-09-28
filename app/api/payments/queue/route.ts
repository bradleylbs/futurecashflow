// app/api/payments/queue/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyJWT } from "@/lib/auth"
import { executeQuery } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWT(request as unknown as Request)
    if (!user || (user.role.toLowerCase() !== "admin" && user.role.toLowerCase() !== "fm_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Enhanced query with proper joins including early_payment_offers
    const queueQuery = `
      SELECT 
        p.id as payment_id,
        p.amount,
        p.status as payment_status,
        p.created_at as payment_created,
        p.updated_at as payment_updated,
        p.early_payment_offer_id,
        epo.id as offer_id,
        epo.invoice_number,
        epo.vendor_number,
        epo.offered_amount,
        epo.fee_percent,
        epo.fee_amount,
        epo.status as offer_status,
        epo.accepted_at,
        epo.due_date,
        s.email as supplier_email,
        sc.company_name as supplier_company_name,
        b.email as buyer_email,
        bd.bank_name,
        bd.account_holder_name,
        bd.account_number,
        bd.routing_number,
        bd.status as banking_status
      FROM payments p
      INNER JOIN early_payment_offers epo ON p.early_payment_offer_id = epo.id
      INNER JOIN users s ON p.supplier_user_id = s.id
      LEFT JOIN companies sc ON sc.user_id = p.supplier_user_id
      INNER JOIN users b ON p.buyer_id = b.id
      LEFT JOIN banking_details bd ON p.supplier_user_id = bd.user_id AND bd.status = 'verified'
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
    `

    const result = await executeQuery(queueQuery, [])
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch payment queue" }, { status: 500 })
    }

    return NextResponse.json(result.data || [])
  } catch (error) {
    console.error("Payment queue fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}