"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Eye, Loader2, FileCheck } from "lucide-react"

interface Document {
  id: string
  document_type: string
  filename: string
  file_size: number
  mime_type: string
  status: string
  upload_date: string
  review_date?: string
  review_notes?: string
  version: number
}

interface DocumentUploadProps {
  kycId: string
  userRole: "supplier" | "buyer"
  documents: Document[]
  onDocumentUploaded?: () => void
}

const DOCUMENT_TYPES = {
  supplier: {
    business_registration: "Business Registration Certificate",
    mandate: "Company Mandate/Resolution",
    proof_of_address: "Proof of Business Address",
  },
  buyer: {
    business_registration: "Business Registration Certificate",
    financial_statement: "Financial Statement",
    tax_clearance: "Tax Clearance Certificate",
    bank_confirmation: "Bank Confirmation Letter",
  },
}

export function DocumentUpload({ kycId, userRole, documents, onDocumentUploaded }: DocumentUploadProps) {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const documentTypes = DOCUMENT_TYPES[userRole]
  const requiredCount = userRole === "supplier" ? 2 : 4

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find((d) => d.document_type === docType)
    return doc || null
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploaded: { 
        variant: "secondary" as const, 
        icon: Clock, 
        label: "Uploaded",
        classes: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200/50 backdrop-blur-sm"
      },
      pending: { 
        variant: "secondary" as const, 
        icon: Clock, 
        label: "Pending Review",
  classes: "bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-200/50 backdrop-blur-sm"
      },
      under_review: { 
        variant: "default" as const, 
        icon: Eye, 
        label: "Under Review",
        classes: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200/50 backdrop-blur-sm"
      },
      verified: { 
        variant: "default" as const, 
        icon: CheckCircle, 
        label: "Verified",
  classes: "bg-gradient-to-r from-blue-100 to-purple-200 text-blue-800 border border-blue-200/50 backdrop-blur-sm"
      },
      rejected: { 
        variant: "destructive" as const, 
        icon: AlertCircle, 
        label: "Rejected",
        classes: "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200/50 backdrop-blur-sm"
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.uploaded
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={`flex items-center gap-2 px-3 py-1 rounded-full font-medium ${config.classes}`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </Badge>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleFileSelect = async (docType: string, file: File) => {
    if (!file) return

    // Validate file
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only PDF, JPG, and PNG files are allowed.")
      return
    }

    if (file.size > maxSize) {
      setError("File size too large. Maximum size is 10MB.")
      return
    }

    setUploadingDoc(docType)
    setUploadProgress(0)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("documentType", docType)
      formData.append("kycId", kycId)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch("/api/kyc/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to upload document")
        return
      }

      // Reset file input
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType]!.value = ""
      }

      onDocumentUploaded?.()
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setTimeout(() => {
        setUploadingDoc(null)
        setUploadProgress(0)
      }, 1000)
    }
  }

  const uploadedCount = documents.length
  const progressPercentage = (uploadedCount / requiredCount) * 100

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
          <FileText className="h-6 w-6 text-blue-500" />
          Document Upload
        </CardTitle>
        <CardDescription className="text-gray-700 font-medium">
          Upload required documents for KYC verification
          {userRole === "supplier" && " (minimum 2 documents required)"}
          {userRole === "buyer" && " (all 4 documents required)"}
        </CardDescription>

        <div className="space-y-3 bg-gradient-to-r from-blue-50/60 to-purple-50/60 p-4 rounded-xl border-0 shadow-inner">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-gray-800">
              Progress: {uploadedCount} of {requiredCount} documents
            </span>
            <span className="text-blue-700">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3 bg-gray-200/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </Progress>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur border-0 shadow-lg rounded-xl">
            <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {Object.entries(documentTypes).map(([docType, label]) => {
            const existingDoc = getDocumentStatus(docType)
            const isUploading = uploadingDoc === docType

            return (
              <div key={docType} className="bg-white/70 backdrop-blur-sm border-0 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900 text-lg">{label}</h4>
                    <p className="text-sm text-gray-600 font-medium">PDF, JPG, or PNG • Max 10MB</p>
                  </div>
                  {existingDoc && getStatusBadge(existingDoc.status)}
                </div>

                {existingDoc ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-3 rounded-lg border-0 shadow-inner">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-800">{existingDoc.filename}</span>
                      <span className="text-gray-600">({formatFileSize(existingDoc.file_size)})</span>
                    </div>

                    {existingDoc.review_notes && (
                      <Alert 
                        variant={existingDoc.status === "rejected" ? "destructive" : "default"}
                        className={`border-0 shadow-lg rounded-xl ${
                          existingDoc.status === "rejected" 
                            ? "border-red-200 bg-red-50/80 backdrop-blur" 
                            : "border-blue-200 bg-blue-50/80 backdrop-blur"
                        }`}
                      >
                        <AlertDescription className={`font-medium ${
                          existingDoc.status === "rejected" ? "text-red-700" : "text-blue-700"
                        }`}>
                          {existingDoc.review_notes}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-3">
                      <input
                        ref={(el) => {
                          fileInputRefs.current[docType] = el
                        }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect(docType, file)
                        }}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[docType]?.click()}
                        disabled={isUploading}
                        className="bg-white/70 hover:bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-4 py-2 font-medium hover:scale-105"
                      >
                        <Upload className="mr-2 h-4 w-4 text-blue-600" />
                        Replace Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[docType] = el
                      }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelect(docType, file)
                      }}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRefs.current[docType]?.click()}
                      disabled={isUploading}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 border-0"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-5 w-5" />
                          Upload {label}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {isUploading && (
                  <div className="mt-4 bg-gradient-to-r from-blue-50/60 to-purple-50/60 p-4 rounded-xl border-0 shadow-inner">
                    <Progress value={uploadProgress} className="h-3 bg-gray-200/50 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </Progress>
                    <p className="text-sm text-blue-700 font-medium">Uploading... {uploadProgress}%</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {uploadedCount >= requiredCount && (
          <Alert className="border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur border-0 shadow-lg rounded-xl">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800 font-medium">
              All required documents have been uploaded. You can now submit your KYC application for review.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
