import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/database"
import path from "path"
import fs from "fs/promises"

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const documentType = formData.get("documentType") as string
    const kycId = formData.get("kycId") as string

    if (!file || !documentType || !kycId) {
      return NextResponse.json(
        {
          error: "File, document type, and KYC ID are required",
        },
        { status: 400 },
      )
    }

    // Validate file type and size
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only PDF, JPG, and PNG files are allowed.",
        },
        { status: 400 },
      )
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "File size too large. Maximum size is 10MB.",
        },
        { status: 400 },
      )
    }

    // Validate document type and KYC ownership depending on auth state
    const supplierDocTypes = ["business_registration", "mandate", "proof_of_address"]
    const buyerDocTypes = ["business_registration", "financial_statement", "tax_clearance", "bank_confirmation"]

    if (userId) {
      // Authenticated: validate by role and KYC ownership
      const allowedDocTypes = userRole === "supplier" ? supplierDocTypes : buyerDocTypes
      if (!allowedDocTypes.includes(documentType)) {
        return NextResponse.json({ error: `Invalid document type for ${userRole}` }, { status: 400 })
      }
      const kycCheck = await executeQuery("SELECT id FROM kyc_records WHERE id = ? AND user_id = ?", [kycId, userId])
      if (!kycCheck.success || (kycCheck.data ?? []).length === 0) {
        return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
      }
    } else {
      // Unauthenticated: only allow if this KYC is a draft (user_id IS NULL); validate by company_type
      const draftCheck = await executeQuery(
        `SELECT k.id, c.company_type FROM kyc_records k JOIN companies c ON c.id = k.company_id WHERE k.id = ? AND k.user_id IS NULL LIMIT 1`,
        [kycId],
      )
      if (!draftCheck.success || (draftCheck.data ?? []).length === 0) {
        return NextResponse.json({ error: "KYC draft not found or already claimed", needsAuthentication: true }, { status: 403 })
      }
      const companyType = ((draftCheck.data as any[])[0].company_type as string) || "buyer"
      const allowedDocTypes = companyType === "supplier" ? supplierDocTypes : buyerDocTypes
      if (!allowedDocTypes.includes(documentType)) {
        return NextResponse.json({ error: `Invalid document type for ${companyType}` }, { status: 400 })
      }
    }

  // Store file to local disk under a private folder with basic safety
  const fileBuffer = await file.arrayBuffer()
  const fileName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "_")
  // Save to a private directory not directly accessible via HTTP
  const privateRoot = path.join(process.cwd(), ".private_uploads")
  const relativeDir = path.posix.join("documents", String(kycId))
  const absDir = path.join(privateRoot, relativeDir)
  await fs.mkdir(absDir, { recursive: true })
  const absFilePath = path.join(absDir, fileName)
  await fs.writeFile(absFilePath, Buffer.from(fileBuffer))
  // Persist relative file path (without leading slash)
  const filePath = path.posix.join(relativeDir, fileName)

    // Check if document type already exists and mark old one as replaced
    const existingQuery = `
      SELECT id FROM documents 
      WHERE kyc_id = ? AND document_type = ? AND replaced_by IS NULL
    `
    const existingResult = await executeQuery(existingQuery, [kycId, documentType])

    if (existingResult.success && (existingResult.data ?? []).length > 0) {
      const existingDocId = (existingResult.data as any[])[0].id

      // Insert new document first
      const insertQuery = `
        INSERT INTO documents (kyc_id, document_type, filename, file_path, file_size, mime_type, status)
        VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
      `

      const insertResult = await executeQuery(insertQuery, [
        kycId,
        documentType,
        fileName,
        filePath,
        file.size,
        file.type,
      ])

      if (!insertResult.success) {
        return NextResponse.json({ error: "Failed to save document record" }, { status: 500 })
      }
      // Fetch latest inserted doc to return minimal info
      const newDocSelect = await executeQuery(
        `SELECT id, filename, file_size, mime_type, upload_date, status FROM documents 
         WHERE kyc_id = ? AND document_type = ? AND replaced_by IS NULL 
         ORDER BY upload_date DESC LIMIT 1`,
        [kycId, documentType],
      )
      const newDoc = newDocSelect.success && (newDocSelect.data ?? []).length > 0 ? (newDocSelect.data as any[])[0] : null

      // Mark old document as replaced
      await executeQuery("UPDATE documents SET replaced_by = ?, updated_at = NOW() WHERE id = ?", [
        newDoc.id,
        existingDocId,
      ])

      return NextResponse.json({
        message: "Document uploaded and replaced previous version successfully",
        document: newDoc,
      })
    } else {
      // Insert new document
      const insertQuery = `
        INSERT INTO documents (kyc_id, document_type, filename, file_path, file_size, mime_type, status)
        VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
      `

      const result = await executeQuery(insertQuery, [kycId, documentType, fileName, filePath, file.size, file.type])

      if (!result.success) {
        return NextResponse.json({ error: "Failed to save document record" }, { status: 500 })
      }
      const newDoc = await executeQuery(
        `SELECT id, document_type, filename, file_size, mime_type, status, upload_date FROM documents
         WHERE kyc_id = ? AND document_type = ? AND replaced_by IS NULL ORDER BY upload_date DESC LIMIT 1`,
        [kycId, documentType],
      )

      return NextResponse.json({
        message: "Document uploaded successfully",
        document: newDoc.success && (newDoc.data ?? []).length > 0 ? (newDoc.data as any[])[0] : null,
      })
    }
  } catch (error) {
    console.error("Document upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware headers
  const userId = request.headers.get("x-user-id")

    const { searchParams } = new URL(request.url)
    const kycId = searchParams.get("kycId")

    if (!kycId) {
      return NextResponse.json({ error: "KYC ID is required" }, { status: 400 })
    }

    // Verify KYC record belongs to user or is a draft when unauthenticated
    if (userId) {
      const kycCheck = await executeQuery("SELECT id FROM kyc_records WHERE id = ? AND user_id = ?", [kycId, userId])
      if (!kycCheck.success || (kycCheck.data ?? []).length === 0) {
        return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
      }
    } else {
      const draftCheck = await executeQuery(
        `SELECT id FROM kyc_records WHERE id = ? AND user_id IS NULL LIMIT 1`,
        [kycId],
      )
      if (!draftCheck.success || (draftCheck.data ?? []).length === 0) {
        return NextResponse.json({ error: "KYC draft not found or already claimed", needsAuthentication: true }, { status: 403 })
      }
    }

    // Get documents for this KYC record (only current versions)
    const query = `
      SELECT 
        id, document_type, filename, file_size, mime_type, status,
        upload_date, review_date, review_notes, version
      FROM documents 
      WHERE kyc_id = ? AND replaced_by IS NULL
      ORDER BY document_type, upload_date DESC
    `

    const result = await executeQuery(query, [kycId])

    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }

    return NextResponse.json({ documents: result.data })
  } catch (error) {
    console.error("Get documents error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
