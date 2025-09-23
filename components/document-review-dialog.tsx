"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Eye, Loader2, FileText } from "lucide-react"

interface Document {
  document_id: string
  document_type: string
  filename: string
  file_size: number
  document_status: string
  upload_date: string
  review_notes?: string
  company_name: string
  invited_company_name?: string
  email: string
  user_role: string
}

interface DocumentReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document
  onReviewComplete: () => void
}

const DOCUMENT_TYPE_LABELS = {
  business_registration: "Business Registration Certificate",
  mandate: "Company Mandate/Resolution",
  proof_of_address: "Proof of Business Address",
  financial_statement: "Financial Statement",
  tax_clearance: "Tax Clearance Certificate",
  bank_confirmation: "Bank Confirmation Letter",
}

export function DocumentReviewDialog({ open, onOpenChange, document, onReviewComplete }: DocumentReviewDialogProps) {
  const [action, setAction] = useState<"start_review" | "verify" | "reject" | null>(null)
  const [notes, setNotes] = useState(document.review_notes || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!action) {
      setError("Please select an action")
      return
    }

    if (action === "reject" && !notes.trim()) {
      setError("Please provide a reason for rejection")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/documents/${document.document_id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action,
          notes: notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to update document")
        return
      }

      onReviewComplete()
      onOpenChange(false)

      // Reset form
      setAction(null)
      setNotes("")
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploaded: { variant: "secondary" as const, icon: FileText, label: "Uploaded" },
      pending: { variant: "secondary" as const, icon: FileText, label: "Pending" },
      under_review: { variant: "default" as const, icon: Eye, label: "Under Review" },
      verified: { variant: "default" as const, icon: CheckCircle, label: "Verified" },
      rejected: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const companyName = document.company_name || document.invited_company_name || "Unknown Company"
  const documentLabel =
    DOCUMENT_TYPE_LABELS[document.document_type as keyof typeof DOCUMENT_TYPE_LABELS] || document.document_type

  const availableActions = () => {
    switch (document.document_status) {
      case "pending":
        return ["start_review", "verify", "reject"]
      case "under_review":
        return ["verify", "reject"]
      default:
        return []
    }
  }

  const actions = availableActions()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-3xl bg-white max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Document</DialogTitle>
          <DialogDescription>Review and update the status of this document</DialogDescription>
        </DialogHeader>

  <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Document Information */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Document Type:</span>
              <Badge variant="outline">{documentLabel}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Filename:</span>
              <span className="text-sm">{document.filename}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">File Size:</span>
              <span className="text-sm">{formatFileSize(document.file_size)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Company:</span>
              <span className="text-sm">{companyName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Status:</span>
              {getStatusBadge(document.document_status)}
            </div>
          </div>

          {/* Inline Preview */}
      <div className="border rounded-md overflow-hidden">
            <iframe
              title="Document Preview"
              src={`/api/admin/documents/${document.document_id}/preview`}
        className="w-full h-[70vh] bg-white"
            />
          </div>

          {/* Action Selection */}
          {actions.length > 0 && (
            <div className="space-y-3">
              <Label>Action *</Label>
              <div className="flex flex-col gap-2">
                {actions.includes("start_review") && (
                  <Button
                    variant={action === "start_review" ? "default" : "outline"}
                    onClick={() => setAction("start_review")}
                    className="justify-start"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Start Review
                  </Button>
                )}
                {actions.includes("verify") && (
                  <Button
                    variant={action === "verify" ? "default" : "outline"}
                    onClick={() => setAction("verify")}
                    className="justify-start"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verify Document
                  </Button>
                )}
                {actions.includes("reject") && (
                  <Button
                    variant={action === "reject" ? "destructive" : "outline"}
                    onClick={() => setAction("reject")}
                    className="justify-start"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Document
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Review Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Review Notes {action === "reject" && "(Required for rejection)"}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                action === "reject"
                  ? "Required: Explain why this document is being rejected..."
                  : "Optional: Add any notes about this document review..."
              }
              rows={3}
            />
          </div>

          {action === "reject" && !notes.trim() && (
            <Alert>
              <AlertDescription>
                Please provide a reason for rejection to help the user understand what needs to be corrected.
              </AlertDescription>
            </Alert>
          )}

          {actions.length === 0 && (
            <Alert>
              <AlertDescription>
                This document has already been reviewed and cannot be modified further.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {actions.length > 0 && (
            <Button onClick={handleSubmit} disabled={isLoading || !action || (action === "reject" && !notes.trim())}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `${action === "start_review" ? "Start Review" : action === "verify" ? "Verify" : "Reject"} Document`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
