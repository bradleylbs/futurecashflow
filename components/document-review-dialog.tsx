"use client"

import { useMemo, useState, useEffect } from "react"
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
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  FileX,
  Shield,
  Building2,
} from "lucide-react"

interface Document {
  document_id: string
  document_type: string
  filename: string
  file_size: number
  document_status: "uploaded" | "pending" | "under_review" | "verified" | "rejected"
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

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  business_registration: "Business Registration",
  mandate: "Company Mandate",
  proof_of_address: "Proof of Address",
  financial_statement: "Financial Statement",
  tax_clearance: "Tax Clearance",
  bank_confirmation: "Bank Confirmation",
}

export function DocumentReviewDialog({
  open,
  onOpenChange,
  document,
  onReviewComplete,
}: DocumentReviewDialogProps) {
  const [action, setAction] = useState<"start_review" | "verify" | "reject" | "resubmit" | null>(null)
  const [notes, setNotes] = useState(document.review_notes || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (open) {
      setAction(null)
      setNotes(document.review_notes || "")
      setIsLoading(false)
      setError("")
      setSuccessMessage("")
    }
  }, [open, document.review_notes])

  const companyName = useMemo(
    () => document.company_name || document.invited_company_name || "Unknown Company",
    [document.company_name, document.invited_company_name]
  )

  const documentLabel = useMemo(
    () => DOCUMENT_TYPE_LABELS[document.document_type] || toTitleCase(document.document_type),
    [document.document_type]
  )

  type ReviewAction = "start_review" | "verify" | "reject"
  const actions: ReviewAction[] = useMemo(() => {
    switch (document.document_status) {
      case "pending":
        return ["start_review", "verify", "reject"]
      case "under_review":
        return ["verify", "reject"]
      default:
        return []
    }
  }, [document.document_status])

  const handleSubmit = async () => {
    if (!action) {
      setError("Please select an action")
      return
    }
    if ((action === "reject" || action === "resubmit") && !notes.trim()) {
      setError("Please provide review notes for this action")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const response = await fetch(`/api/admin/documents/${document.document_id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          notes: notes.trim() || null,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error || "Failed to update document")
        return
      }

      setSuccessMessage("Document review updated successfully")
      setTimeout(() => {
        onReviewComplete()
        onOpenChange(false)
      }, 900)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 sm:max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Review Document
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Verify, approve, or reject this submitted document
            </DialogDescription>
          </DialogHeader>

          {/* Feedback banners */}
          <div className="space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left rail: meta + preview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Document meta */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Document Type
                  </span>
                  <TypeBadge type={document.document_type} label={documentLabel} />
                </div>

                <Separator className="my-3 bg-white/10" />

                <MetaRow label="Company" value={companyName} />
                <MetaRow label="Filename" value={document.filename} mono />
                <MetaRow label="File Size" value={formatFileSize(document.file_size)} />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  {getStatusBadge(document.document_status)}
                </div>
              </div>

              {/* Inline preview */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-white/10 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Inline preview
                </div>
                <iframe
                  title="Document Preview"
                  src={`/api/admin/documents/${document.document_id}/preview`}
                  className="w-full h-[50vh] bg-white"
                />
              </div>
            </div>

            {/* Right rail: actions */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-semibold">Review Action</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>

                {actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No actions available for the current status.
                  </p>
                ) : (
                  <RadioGroup
                    value={action ?? undefined}
                    onValueChange={(v) => setAction(v as any)}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    {actions.includes("start_review") && (
                      <ActionCard
                        id="start_review"
                        title="Start review"
                        description="Move to under review"
                        icon={Eye}
                      />
                    )}
                    {actions.includes("verify") && (
                      <ActionCard
                        id="verify"
                        title="Verify"
                        description="Mark as verified"
                        icon={CheckCircle2}
                        color="green"
                      />
                    )}
                    {actions.includes("reject") && (
                      <ActionCard
                        id="reject"
                        title="Reject"
                        description="Send back with notes"
                        icon={FileX}
                        color="red"
                      />
                    )}
                  </RadioGroup>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Label htmlFor="notes" className="mb-2 block">
                  Review notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder={
                    action === "reject"
                      ? "Explain what’s missing or incorrect so the user can fix it."
                      : "Optional context for verification or internal audit trail."
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[140px]"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Notes are stored with the review action. Applicants will see notes for rejections.
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || !action}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Applying…
                    </>
                  ) : action === "verify" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm verification
                    </>
                  ) : action === "reject" ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Submit rejection
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Start review
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </div>

          {/* Make content scrollable under header on small viewports */}
          <ScrollArea className="max-h-[0px]" />
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

/* ---------- helpers ---------- */

function toTitleCase(s: string) {
  return s
    .replace(/[_-]/g, " ")
    .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
}

function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return "—"
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function MetaRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${mono ? "font-mono" : "font-medium"} ml-4 text-right break-all`}>
        {value || "—"}
      </span>
    </div>
  )
}

function TypeBadge({ type, label }: { type: string; label: string }) {
  const cfg: Record<string, { icon: any; cls: string }> = {
    business_registration: { icon: Building2, cls: "from-blue-500/20 to-indigo-500/20 text-blue-400" },
    mandate: { icon: Shield, cls: "from-purple-500/20 to-pink-500/20 text-purple-400" },
    proof_of_address: { icon: Building2, cls: "from-green-500/20 to-emerald-500/20 text-green-400" },
    financial_statement: { icon: FileText, cls: "from-amber-500/20 to-orange-500/20 text-amber-400" },
    tax_clearance: { icon: CheckCircle2, cls: "from-red-500/20 to-rose-500/20 text-red-400" },
    bank_confirmation: { icon: Building2, cls: "from-indigo-500/20 to-blue-500/20 text-indigo-400" },
  }
  const c = cfg[type] || { icon: FileText, cls: "from-gray-500/20 to-slate-500/20 text-gray-300" }
  const Icon = c.icon
  return (
    <Badge
      className={`flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r ${c.cls} border border-white/10 font-medium`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}

function getStatusBadge(status: Document["document_status"]) {
  const statusConfig = {
    uploaded: {
      icon: FileText,
      label: "Uploaded",
      bgClass: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      tip: "File uploaded, not yet queued",
    },
    pending: {
      icon: Clock,
      label: "Pending",
      bgClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      tip: "Awaiting review",
    },
    under_review: {
      icon: Eye,
      label: "Under Review",
      bgClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      tip: "Currently being reviewed",
    },
    verified: {
      icon: CheckCircle,
      label: "Verified",
      bgClass: "bg-green-500/20 text-green-400 border-green-500/30",
      tip: "Document verified",
    },
    rejected: {
      icon: XCircle,
      label: "Rejected",
      bgClass: "bg-red-500/20 text-red-400 border-red-500/30",
      tip: "Returned with issues",
    },
  } as const

  const cfg = statusConfig[status] || statusConfig.pending
  const Icon = cfg.icon
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${cfg.bgClass} font-medium`}>
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{cfg.tip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function ActionCard({
  id,
  title,
  description,
  icon: Icon,
  color = "blue",
}: {
  id: "start_review" | "verify" | "reject"
  title: string
  description: string
  icon: any
  color?: "blue" | "green" | "red"
}) {
  const colorCls =
    color === "green"
      ? "from-green-500/15 to-emerald-500/15 hover:from-green-500/25 hover:to-emerald-500/25"
      : color === "red"
      ? "from-red-500/15 to-rose-500/15 hover:from-red-500/25 hover:to-rose-500/25"
      : "from-blue-500/15 to-indigo-500/15 hover:from-blue-500/25 hover:to-indigo-500/25"

  return (
    <Label
      htmlFor={id}
      className={`cursor-pointer rounded-xl border border-white/10 bg-gradient-to-br ${colorCls} p-3 flex items-start gap-3 transition-all`}
    >
      <RadioGroupItem id={id} value={id} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </Label>
  )
}
