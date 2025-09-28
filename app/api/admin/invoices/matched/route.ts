import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const status = searchParams.get("status")

    // Build the main query - FIXED to match actual schema
    let sqlQuery = `
      SELECT
        r.vendor_number AS id,
        COALESCE(MAX(sc.company_name), r.vendor_number) AS supplier_name,
        COUNT(DISTINCT r.id) AS invoice_count,
        SUM(r.amount) AS total_amount,
        MAX(bc.company_name) AS buyer_name,
        CASE
          WHEN r.vendor_number IS NULL OR r.vendor_number = '' THEN 'missing_data'
          WHEN (MAX(vc.supplier_user_id) IS NOT NULL AND MAX(vc.consent_status) = 'consented')
               OR (MAX(bsl.supplier_user_id) IS NOT NULL AND MAX(bsl.status) = 'active') THEN 'matched'
          WHEN COUNT(DISTINCT COALESCE(vc.supplier_user_id, bsl.supplier_user_id)) > 1 THEN 'conflict'
          ELSE 'new_profile'
        END AS match_status,
        GROUP_CONCAT(DISTINCT r.vendor_number) AS vendor_numbers,
        MAX(r.created_at) AS last_invoice_date,
        COALESCE(MAX(vc.supplier_user_id), MAX(bsl.supplier_user_id)) AS supplier_id,
        'ZAR' AS currency,
        FALSE as returning_supplier,
        GROUP_CONCAT(DISTINCT CONCAT(
          r.id, ':::',
          COALESCE(r.invoice_number, ''), ':::',
          r.amount, ':::',
          COALESCE(r.due_date, ''), ':::',
          COALESCE(r.status, ''), ':::',  -- Using r.status instead of validation_status
          r.created_at, ':::',
          COALESCE(r.batch_id, ''), ':::',  -- Using batch_id instead of batch_total
          COALESCE((SELECT created_at FROM ap_batches WHERE id = r.batch_id), ''), ':::',  -- Get batch date from ap_batches
          '', ':::',  -- payment_status (not in schema)
          '', ':::',  -- payment_date (not in schema)
          ''  -- payment_reference (not in schema)
        )) as invoice_data
      FROM ap_batch_rows r
      LEFT JOIN vendor_consents vc ON r.vendor_number = vc.vendor_number AND r.buyer_id = vc.buyer_id
      LEFT JOIN buyer_supplier_links bsl ON r.buyer_id = bsl.buyer_id AND bsl.status = 'active'
      LEFT JOIN users su ON COALESCE(vc.supplier_user_id, bsl.supplier_user_id) = su.id
      LEFT JOIN companies sc ON su.id = sc.user_id AND sc.company_type = 'supplier'
      INNER JOIN users bu ON r.buyer_id = bu.id
      LEFT JOIN companies bc ON bu.id = bc.user_id AND bc.company_type = 'buyer'
      WHERE r.status = 'accepted'
    `

    // Add search filter if provided
    if (query) {
      sqlQuery += ` AND (
        r.vendor_number LIKE '%${query}%' OR
        COALESCE(sc.company_name, r.vendor_number) LIKE '%${query}%' OR
        bc.company_name LIKE '%${query}%'
      )`
    }

    sqlQuery += ` GROUP BY r.buyer_id, r.vendor_number`

    // Add status filter if provided
    if (status && status !== "all") {
      sqlQuery += ` HAVING match_status = '${status}'`
    }

    sqlQuery += ` ORDER BY total_amount DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`

    const result = await executeQuery(sqlQuery)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch supplier matches" }, { status: 500 })
    }

    // Parse invoice data from the concatenated string
    const suppliersWithCorrectTypes = (result.data || []).map((supplier: any) => {
      const invoices = supplier.invoice_data ? supplier.invoice_data.split(',').map((invoiceStr: string) => {
        const parts = invoiceStr.split(':::')
        return {
          id: parts[0] || '',  // UUID string, not number
          invoice_number: parts[1] || '',
          amount: Number.parseFloat(parts[2]) || 0,
          due_date: parts[3] || '',
          validation_status: parts[4] || 'accepted',  // Using status from ap_batch_rows
          created_at: parts[5] || '',
          batch_total: 0,  // Not available in current schema
          batch_date: parts[7] || '',
          payment_status: parts[8] || undefined,
          payment_date: parts[9] || undefined,
          payment_reference: parts[10] || undefined,
          vendor_number: supplier.id // Use the vendor number from the supplier
        }
      }) : []

      return {
        ...supplier,
        total_amount: Number.parseFloat(supplier.total_amount) || 0,
        invoice_count: Number.parseInt(supplier.invoice_count) || 0,
        returning_supplier: supplier.returning_supplier || false,
        vendor_numbers: supplier.vendor_numbers ? supplier.vendor_numbers.split(",") : [supplier.id],
        invoices: invoices
      }
    })

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT CONCAT(r.buyer_id, '-', r.vendor_number)) as total
      FROM ap_batch_rows r
      LEFT JOIN vendor_consents vc ON r.vendor_number = vc.vendor_number AND r.buyer_id = vc.buyer_id
      LEFT JOIN buyer_supplier_links bsl ON r.buyer_id = bsl.buyer_id AND bsl.status = 'active'
      LEFT JOIN users su ON COALESCE(vc.supplier_user_id, bsl.supplier_user_id) = su.id
      LEFT JOIN companies sc ON su.id = sc.user_id AND sc.company_type = 'supplier'
      INNER JOIN users bu ON r.buyer_id = bu.id
      LEFT JOIN companies bc ON bu.id = bc.user_id AND bc.company_type = 'buyer'
      WHERE r.status = 'accepted'
      ${
        query
          ? `AND (
        r.vendor_number LIKE '%${query}%' OR
        COALESCE(sc.company_name, r.vendor_number) LIKE '%${query}%' OR
        bc.company_name LIKE '%${query}%'
      )`
          : ""
      }
    `

    const countResult = await executeQuery(countQuery)
    const totalCount = countResult.success ? countResult.data?.[0]?.total || 0 : 0

    const response = {
      suppliers: suppliersWithCorrectTypes,
      total: totalCount,
      page,
      limit,
      stats: {
        total_suppliers: suppliersWithCorrectTypes.length,
        matched_suppliers: suppliersWithCorrectTypes.filter((s: any) => s.match_status === "matched").length,
        new_suppliers: suppliersWithCorrectTypes.filter((s: any) => s.match_status === "new_profile").length,
        conflict_suppliers: suppliersWithCorrectTypes.filter((s: any) => s.match_status === "conflict").length,
        missing_data_suppliers: suppliersWithCorrectTypes.filter((s: any) => s.match_status === "missing_data").length,
        total_invoice_count: suppliersWithCorrectTypes.reduce((sum: number, s: any) => sum + s.invoice_count, 0),
        total_amount: suppliersWithCorrectTypes.reduce((sum: number, s: any) => sum + s.total_amount, 0),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in API route:", error)
    return NextResponse.json(
      { error: "Unexpected server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}