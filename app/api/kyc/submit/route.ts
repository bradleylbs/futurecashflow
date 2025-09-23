import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import { sendBuyerMilestoneEmail } from "@/lib/email"
import { getDashboardUrl } from "@/lib/url-utils"

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware headers
  const userId = request.headers.get("x-user-id")
  const userRole = request.headers.get("x-user-role")

    const { kycId } = await request.json()

    if (!kycId) {
      return NextResponse.json({ error: "KYC ID is required" }, { status: 400 })
    }

    // Load KYC; support unauthenticated draft submission if user is not logged in
    let kycRecord: any = null
    if (userId) {
      const kycCheck = await executeQuery("SELECT id, status FROM kyc_records WHERE id = ? AND user_id = ?", [kycId, userId])
      if (!kycCheck.success || (kycCheck.data ?? []).length === 0) {
        return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
      }
      kycRecord = (kycCheck.data as any[])[0]
    } else {
      const draftCheck = await executeQuery(
        `SELECT k.id, k.status, c.company_type FROM kyc_records k JOIN companies c ON c.id = k.company_id WHERE k.id = ? AND k.user_id IS NULL LIMIT 1`,
        [kycId],
      )
      if (!draftCheck.success || (draftCheck.data ?? []).length === 0) {
        return NextResponse.json({ error: "KYC draft not found or already claimed", needsAuthentication: true }, { status: 403 })
      }
      kycRecord = (draftCheck.data as any[])[0]
    }

    if (kycRecord.status !== "pending") {
      return NextResponse.json(
        {
          error: "KYC application has already been submitted",
        },
        { status: 400 },
      )
    }

    // Check minimum document requirements
    // Determine role/type for requirements (use company_type for unauthenticated drafts)
    const roleOrType = userId ? userRole : (kycRecord.company_type as string) || "buyer"
    const requiredDocs =
      roleOrType === "supplier"
        ? ["business_registration", "mandate"]
        : ["business_registration", "financial_statement", "tax_clearance", "bank_confirmation"]

    const docQuery = `
      SELECT document_type, COUNT(*) as count
      FROM documents 
      WHERE kyc_id = ? AND replaced_by IS NULL AND status = 'uploaded'
      GROUP BY document_type
    `

    const docResult = await executeQuery(docQuery, [kycId])

    if (!docResult.success) {
      return NextResponse.json({ error: "Failed to check documents" }, { status: 500 })
    }

  const uploadedDocs = (docResult.data as any[]).map((d: any) => d.document_type)
    const minRequiredCount = roleOrType === "supplier" ? 2 : 4

    if (uploadedDocs.length < minRequiredCount) {
      const missingMessage =
        userRole === "supplier"
          ? "At least 2 documents are required for submission"
          : "All 4 required documents must be uploaded before submission"

      return NextResponse.json(
        {
          error: missingMessage,
          uploadedDocuments: uploadedDocs,
          requiredDocuments: requiredDocs,
        },
        { status: 400 },
      )
    }

    // For buyers, check all required docs are present
  if (roleOrType === "buyer") {
      const missingDocs = requiredDocs.filter((doc) => !uploadedDocs.includes(doc))
      if (missingDocs.length > 0) {
        return NextResponse.json(
          {
            error: "Missing required documents",
            missingDocuments: missingDocs,
          },
          { status: 400 },
        )
      }
    }

  // If supplier, link latest active invitation when authenticated only
  if (userId && roleOrType === "supplier") {
      const inv = await executeQuery(
        `SELECT id FROM supplier_invitations WHERE supplier_user_id = ? AND status IN ('opened','registered','sent') ORDER BY created_at DESC LIMIT 1`,
        [userId],
      )
      const inviteId = inv.success && (inv.data ?? []).length > 0 ? (inv.data as any[])[0].id : null
      if (inviteId) {
        await executeQuery(`UPDATE kyc_records SET invitation_id = ? WHERE id = ?`, [inviteId, kycId])
        // Notify buyer: supplier submitted KYC
        const buyer = await executeQuery(`SELECT u.email FROM supplier_invitations si JOIN users u ON si.buyer_id = u.id WHERE si.id = ?`, [inviteId])
        const buyerEmail = buyer.success && (buyer.data ?? []).length > 0 ? (buyer.data as any[])[0].email : null
        if (buyerEmail) {
          await sendBuyerMilestoneEmail(buyerEmail, "Supplier KYC Submitted", {
            heading: "Your invited supplier has submitted their KYC",
            paragraphs: [
              "A supplier you invited has completed their KYC submission and is awaiting review.",
              "You can monitor progress from your dashboard.",
            ],
            ctaHref: getDashboardUrl('buyer', request),
          })
        }
      }
    }

    // Update KYC status to under_review and set submitted_at
    const updateQuery = `
      UPDATE kyc_records 
      SET status = 'under_review', submitted_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `

    const updateResult = await executeQuery(updateQuery, [kycId])

    if (!updateResult.success) {
      return NextResponse.json({ error: "Failed to submit KYC application" }, { status: 500 })
    }

    // Update all uploaded documents to pending status
  await executeQuery("UPDATE documents SET status = 'pending', updated_at = NOW() WHERE kyc_id = ? AND status = 'uploaded'", [kycId])

    return NextResponse.json({
      message: "KYC application submitted successfully",
  kycRecord: { id: kycId, status: 'under_review', submitted_at: new Date() },
    })
  } catch (error) {
    console.error("Submit KYC error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
