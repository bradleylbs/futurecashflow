import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId || !["admin", "fm_admin", "fa_admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    const documentId = params.id
    const { action, notes } = await request.json()

    if (!["start_review", "verify", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get document and KYC info
    const docQuery = `
      SELECT d.id, d.status, d.kyc_id, k.status as kyc_status
      FROM documents d
      JOIN kyc_records k ON d.kyc_id = k.id
      WHERE d.id = ? AND d.replaced_by IS NULL
    `

    const docResult = await executeQuery(docQuery, [documentId])

    if (!docResult.success || (docResult.data ?? []).length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const document: any = (docResult.data as any[])[0]
    const kycId = document.kyc_id

    let newStatus: string
    let updateKycStatus = false

    switch (action) {
      case "start_review":
        if (document.status !== "pending") {
          return NextResponse.json({ error: "Document is not pending review" }, { status: 400 })
        }
        newStatus = "under_review"

        // Update KYC status to under_review if it's still pending
        if (document.kyc_status === "pending") {
          updateKycStatus = true
        }
        break

      case "verify":
        if (!["pending", "under_review"].includes(document.status)) {
          return NextResponse.json({ error: "Document cannot be verified in current status" }, { status: 400 })
        }
        newStatus = "verified"
        break

      case "reject":
        if (!["pending", "under_review"].includes(document.status)) {
          return NextResponse.json({ error: "Document cannot be rejected in current status" }, { status: 400 })
        }
        newStatus = "rejected"
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Update document status
    const updateDocQuery = `
      UPDATE documents 
      SET status = ?, review_date = NOW(), review_notes = ?, reviewer_id = ?, updated_at = NOW()
      WHERE id = ?
    `

    const updateResult = await executeQuery(updateDocQuery, [newStatus, notes || null, userId, documentId])

    if (!updateResult.success) {
      return NextResponse.json({ error: "Failed to update document status" }, { status: 500 })
    }

    // Update KYC status if needed
    if (updateKycStatus) {
      await executeQuery("UPDATE kyc_records SET status = 'under_review', reviewed_at = NOW(), updated_at = NOW() WHERE id = ?", [kycId])
    }

    // Check if all documents for this KYC are reviewed (for ready_for_decision status)
    if (action === "verify" || action === "reject") {
      const allDocsQuery = `
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN status IN ('verified', 'rejected') THEN 1 END) as reviewed
        FROM documents 
        WHERE kyc_id = ? AND replaced_by IS NULL
      `

      const allDocsResult = await executeQuery(allDocsQuery, [kycId])

      if (allDocsResult.success && (allDocsResult.data ?? []).length > 0) {
        const { total, reviewed } = (allDocsResult.data as any[])[0] as any

        if (Number.parseInt(total) === Number.parseInt(reviewed) && document.kyc_status === "under_review") {
          // All documents reviewed, update KYC to ready_for_decision
      await executeQuery("UPDATE kyc_records SET status = 'ready_for_decision', updated_at = NOW() WHERE id = ?", [kycId])
        }
      }
    }

    return NextResponse.json({
      message: `Document ${action.replace("_", " ")} completed successfully`,
    document: { id: documentId, status: newStatus, review_date: new Date() },
    })
  } catch (error) {
    console.error("Document review error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
