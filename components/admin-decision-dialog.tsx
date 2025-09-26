"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface Application {
  kyc_id: string
  kyc_status: string
  email: string
  user_role: string
  company_name: string
  invited_company_name?: string
  document_count: number
  verified_documents: number
  rejected_documents: number
  pending_documents: number
}

interface AdminDecisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: Application
  onDecisionComplete: () => void
}

export function AdminDecisionDialog({ open, onOpenChange, application, onDecisionComplete }: AdminDecisionDialogProps) {
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!decision) {
      setError("Please select a decision")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/kyc/${application.kyc_id}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          decision,
          notes: notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to make decision")
        return
      }

      onDecisionComplete()
      onOpenChange(false)

      // Reset form
      setDecision(null)
      setNotes("")
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const companyName = application.company_name || application.invited_company_name || "Unknown Company"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-3xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
            KYC Application Decision
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Review and make a decision on this KYC application. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border border-red-200 bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur shadow-lg rounded-xl">
              <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {/* Application Summary */}
          <div className="bg-gradient-to-br from-blue-50/80 via-white/80 to-purple-50/80 border border-blue-100/60 backdrop-blur-md p-6 rounded-2xl shadow-xl space-y-3">
            <h3 className="font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-4 text-lg tracking-tight">
              Application Summary
            </h3>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Company:</span>
              <span className="font-semibold text-gray-900">{companyName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Email:</span>
              <span className="font-semibold text-gray-900">{application.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Type:</span>
              <span className="font-semibold text-gray-900 capitalize">{application.user_role}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Documents:</span>
              <span className="font-semibold text-gray-900">
                <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold mr-1">{application.verified_documents} verified</span>
                <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-xs font-semibold mr-1">{application.rejected_documents} rejected</span>
                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">{application.document_count} total</span>
              </span>
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
              Decision *
            </Label>
            <div className="flex gap-4">
              <Button
                onClick={() => setDecision("approve")}
                className={`flex-1 py-4 px-6 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none border-0 ${
                  decision === "approve"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl"
                    : "bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-700"
                }`}
                disabled={application.kyc_status !== "ready_for_decision" || application.pending_documents > 0}
                aria-pressed={decision === "approve"}
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Approve Application
              </Button>
              <Button
                onClick={() => setDecision("reject")}
                className={`flex-1 py-4 px-6 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-rose-400/60 focus-visible:outline-none border-0 ${
                  decision === "reject"
                    ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-xl"
                    : "bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-700"
                }`}
                aria-pressed={decision === "reject"}
              >
                <XCircle className="mr-2 h-5 w-5" />
                Reject Application
              </Button>
            </div>
          </div>

          {/* Decision Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
              Decision Notes {decision === "reject" && "(Required for rejection)"}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                decision === "approve"
                  ? "Optional: Add any notes about the approval..."
                  : decision === "reject"
                    ? "Required: Explain the reason for rejection..."
                    : "Add notes about your decision..."
              }
              rows={4}
              className="border border-blue-100/60 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/90 transition-all duration-300 placeholder:text-gray-500 resize-none"
            />
          </div>

          {decision === "reject" && !notes.trim() && (
            <Alert className="border border-blue-200 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur shadow-lg rounded-xl">
              <AlertDescription className="text-blue-700 font-medium">
                Please provide a reason for rejection to help the applicant understand what needs to be corrected.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="pt-6 flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-white/80 backdrop-blur-md border border-blue-100/60 shadow-lg hover:bg-white/90 hover:scale-105 transition-all duration-300 px-6 py-3 rounded-2xl font-semibold"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !decision || (decision === "reject" && !notes.trim())}
            className={`px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 font-semibold border-0 ${
              decision === "approve"
                ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                : decision === "reject"
                  ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Decision...
              </>
            ) : (
              `${decision === "approve" ? "Approve" : decision === "reject" ? "Reject" : "Submit"} Application`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
