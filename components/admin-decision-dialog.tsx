"use client"

import { useState, useEffect } from "react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
  Shield,
  Clock,
  Calendar,
  User,
  Building2,
  Hash,
  Mail,
  FileText,
  Activity,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XOctagon,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Zap,
  MessageSquare,
  Flag,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  FileCheck,
  FileClock,
  FileX,
  Briefcase,
  CreditCard,
  DollarSign,
  Target,
  Award,
  Sparkles,
  Star,
  Heart,
} from "lucide-react"

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
  registration_number?: string
  tax_number?: string
  company_email?: string
  company_phone?: string
  company_address?: string
  submitted_at?: string
}

interface AdminDecisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: Application
  onDecisionComplete: () => void
}

// Decision templates for common scenarios
const DECISION_TEMPLATES = {
  approve: [
    {
      id: "complete",
      label: "All requirements met",
      template: "Application approved. All documentation is complete and verified.",
      icon: CheckCircle2
    },
    {
      id: "verified",
      label: "Identity and documents verified", 
      template: "Company identity verified and all documents authenticated successfully.",
      icon: ShieldCheck
    },
    {
      id: "compliant",
      label: "Compliance requirements satisfied",
      template: "Application meets all regulatory and compliance requirements.",
      icon: Award
    }
  ],
  reject: [
    {
      id: "incomplete",
      label: "Incomplete documentation",
      template: "Application rejected due to missing or incomplete documentation. Please resubmit with all required documents.",
      icon: FileX
    },
    {
      id: "expired",
      label: "Expired documents",
      template: "One or more documents have expired. Please submit current documentation.",
      icon: Clock
    },
    {
      id: "mismatch",
      label: "Information mismatch",
      template: "Information provided does not match documentation. Please ensure all details are accurate.",
      icon: AlertTriangle
    },
    {
      id: "quality",
      label: "Document quality issues",
      template: "Documents are illegible or of poor quality. Please submit clear, readable copies.",
      icon: FileX
    },
    {
      id: "suspicious",
      label: "Requires further investigation",
      template: "Application flagged for additional review. Our compliance team will contact you.",
      icon: ShieldAlert
    }
  ]
}

// Risk assessment criteria
const RISK_FACTORS = [
  { id: "new_company", label: "Newly registered company (< 1 year)", weight: "medium" },
  { id: "high_value", label: "High transaction values expected", weight: "high" },
  { id: "international", label: "International operations", weight: "medium" },
  { id: "cash_intensive", label: "Cash-intensive business", weight: "high" },
  { id: "complex_structure", label: "Complex ownership structure", weight: "medium" }
]

export function AdminDecisionDialog({ 
  open, 
  onOpenChange, 
  application, 
  onDecisionComplete 
}: AdminDecisionDialogProps) {
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low")
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([])
  const [requiresReview, setRequiresReview] = useState(false)
  const [notifyApplicant, setNotifyApplicant] = useState(true)
  const [activeTab, setActiveTab] = useState("decision")
  const [confidence, setConfidence] = useState(85)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDecision(null)
      setNotes("")
      setError("")
      setSuccessMessage("")
      setSelectedTemplate("")
      setRiskLevel("low")
      setSelectedRiskFactors([])
      setRequiresReview(false)
      setNotifyApplicant(true)
      setActiveTab("decision")
      setConfidence(85)
    }
  }, [open])

  // Apply template to notes
  useEffect(() => {
    if (selectedTemplate && decision) {
      const templates = DECISION_TEMPLATES[decision]
      const template = templates.find(t => t.id === selectedTemplate)
      if (template) {
        setNotes(template.template)
      }
    }
  }, [selectedTemplate, decision])

  // Calculate risk level based on selected factors
  useEffect(() => {
    const highRiskCount = selectedRiskFactors.filter(
      id => RISK_FACTORS.find(f => f.id === id)?.weight === "high"
    ).length
    const mediumRiskCount = selectedRiskFactors.filter(
      id => RISK_FACTORS.find(f => f.id === id)?.weight === "medium"
    ).length

    if (highRiskCount >= 2 || (highRiskCount >= 1 && mediumRiskCount >= 2)) {
      setRiskLevel("high")
      setRequiresReview(true)
    } else if (highRiskCount >= 1 || mediumRiskCount >= 2) {
      setRiskLevel("medium")
    } else {
      setRiskLevel("low")
    }
  }, [selectedRiskFactors])

  // Handle submission
  const handleSubmit = async () => {
    if (!decision) {
      setError("Please select a decision")
      return
    }

    if (decision === "reject" && !notes.trim()) {
      setError("Please provide a reason for rejection")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Prepare decision notes with metadata
      let finalNotes = notes.trim()
      
      if (riskLevel !== "low") {
        finalNotes += `\n\n[Risk Level: ${riskLevel.toUpperCase()}]`
      }
      
      if (selectedRiskFactors.length > 0) {
        finalNotes += `\n[Risk Factors: ${selectedRiskFactors.join(", ")}]`
      }
      
      if (requiresReview) {
        finalNotes += `\n[Flagged for additional review]`
      }
      
      finalNotes += `\n[Confidence: ${confidence}%]`

      const response = await fetch(`/api/admin/kyc/${application.kyc_id}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          decision,
          notes: finalNotes || null,
          risk_level: riskLevel,
          requires_review: requiresReview,
          notify_applicant: notifyApplicant,
          confidence
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to make decision")
        return
      }

      setSuccessMessage(`Application ${decision === 'approve' ? 'approved' : 'rejected'} successfully`)
      
      // Wait briefly to show success message
      setTimeout(() => {
        onDecisionComplete()
        onOpenChange(false)
      }, 1500)

    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const companyName = application.company_name || application.invited_company_name || "Unknown Company"

  // Calculate document progress percentage
  const documentProgress = application.document_count > 0
    ? Math.round((application.verified_documents / application.document_count) * 100)
    : 0

  // Check if decision can be made
  const canApprove = application.pending_documents === 0 && application.rejected_documents === 0
  const hasIssues = application.rejected_documents > 0 || application.pending_documents > 0

  // Toggle risk factor selection
  const toggleRiskFactor = (factorId: string) => {
    setSelectedRiskFactors(prev =>
      prev.includes(factorId)
        ? prev.filter(id => id !== factorId)
        : [...prev, factorId]
    )
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              KYC Application Decision
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review and make a final decision on this KYC application
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="bg-white/5 border-white/10 mb-4">
              <TabsTrigger value="decision" className="data-[state=active]:bg-white/10">
                <Shield className="h-4 w-4 mr-2" />
                Decision
              </TabsTrigger>
              <TabsTrigger value="summary" className="data-[state=active]:bg-white/10">
                <FileText className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="risk" className="data-[state=active]:bg-white/10">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Risk Assessment
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-white/10">
                <MessageSquare className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[450px] pr-4">
              <TabsContent value="decision" className="space-y-6 mt-0">
                {/* Alerts */}
                {error && (
                  <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {successMessage && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Warning if documents are incomplete */}
                {hasIssues && (
                  <Alert className="border-amber-500/50 bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertTitle>Attention Required</AlertTitle>
                    <AlertDescription>
                      This application has {application.pending_documents} pending and {application.rejected_documents} rejected documents.
                      Consider these issues before making a decision.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Decision Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={`
                      cursor-pointer transition-all border-2
                      ${decision === "approve"
                        ? "bg-green-500/20 border-green-500/50 shadow-lg"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                      } 
                      ${!canApprove ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    onClick={() => canApprove && setDecision("approve")}
                  >
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2">
                        <CheckCircle className="h-12 w-12 text-green-400" />
                      </div>
                      <CardTitle className="text-green-400">Approve Application</CardTitle>
                      <CardDescription className="text-xs">
                        Grant access to the platform
                      </CardDescription>
                    </CardHeader>
                    {!canApprove && (
                      <CardContent>
                        <p className="text-xs text-center text-amber-400">
                          Cannot approve with pending/rejected documents
                        </p>
                      </CardContent>
                    )}
                  </Card>

                  <Card 
                    className={`
                      cursor-pointer transition-all border-2
                      ${decision === "reject"
                        ? "bg-red-500/20 border-red-500/50 shadow-lg"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                      }
                    `}
                    onClick={() => setDecision("reject")}
                  >
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2">
                        <XCircle className="h-12 w-12 text-red-400" />
                      </div>
                      <CardTitle className="text-red-400">Reject Application</CardTitle>
                      <CardDescription className="text-xs">
                        Deny access and request resubmission
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                {/* Decision Templates */}
                {decision && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        Quick Templates
                      </CardTitle>
                      <CardDescription>Select a template or write custom notes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <div className="grid grid-cols-1 gap-3">
                          {DECISION_TEMPLATES[decision].map(template => (
                            <div
                              key={template.id}
                              className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                            >
                              <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                              <Label
                                htmlFor={template.id}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="flex items-center gap-2 font-medium">
                                  <template.icon className="h-4 w-4 text-muted-foreground" />
                                  {template.label}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {template.template}
                                </p>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                )}

                {/* Confidence Slider */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-400" />
                      Decision Confidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence Level</span>
                        <span className={`text-lg font-bold ${
                          confidence >= 80 ? 'text-green-400' :
                          confidence >= 60 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {confidence}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={confidence}
                        onChange={(e) => setConfidence(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary" className="space-y-6 mt-0">
                {/* Application Summary */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-400" />
                      Application Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Company Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Company Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Company" value={companyName} icon={Building2} />
                        <InfoRow label="Type" value={application.user_role} icon={Briefcase} />
                        <InfoRow label="Email" value={application.email} icon={Mail} />
                        <InfoRow 
                          label="Registration #" 
                          value={application.registration_number || "N/A"} 
                          icon={Hash} 
                        />
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Document Progress */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Document Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Overall Progress</span>
                          <span className="text-sm font-bold">{documentProgress}%</span>
                        </div>
                        <Progress value={documentProgress} className="h-2" />
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                            <span>{application.verified_documents} Verified</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-400" />
                            <span>{application.pending_documents} Pending</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-400" />
                            <span>{application.rejected_documents} Rejected</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-400 mx-auto mb-1" />
                        <p className="text-lg font-bold">{application.document_count}</p>
                        <p className="text-xs text-muted-foreground">Total Docs</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <Activity className="h-6 w-6 text-green-400 mx-auto mb-1" />
                        <p className="text-lg font-bold">{documentProgress}%</p>
                        <p className="text-xs text-muted-foreground">Complete</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <Shield className="h-6 w-6 text-purple-400 mx-auto mb-1" />
                        <p className="text-lg font-bold">{application.kyc_status}</p>
                        <p className="text-xs text-muted-foreground">Status</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="risk" className="space-y-6 mt-0">
                {/* Risk Assessment */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                      Risk Assessment
                    </CardTitle>
                    <CardDescription>Evaluate potential risk factors</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Current Risk Level */}
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Current Risk Level</span>
                        <Badge
                          className={`
                            ${riskLevel === "high" 
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : riskLevel === "medium"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-green-500/20 text-green-400 border-green-500/30"
                            }
                          `}
                        >
                          {riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                      <Progress 
                        value={
                          riskLevel === "high" ? 100 :
                          riskLevel === "medium" ? 50 : 20
                        } 
                        className="h-2"
                      />
                    </div>

                    {/* Risk Factors */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Risk Factors</Label>
                      {RISK_FACTORS.map(factor => (
                        <div key={factor.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={factor.id}
                            checked={selectedRiskFactors.includes(factor.id)}
                            onCheckedChange={() => toggleRiskFactor(factor.id)}
                          />
                          <Label
                            htmlFor={factor.id}
                            className="flex-1 cursor-pointer flex items-center justify-between"
                          >
                            <span className="text-sm">{factor.label}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                factor.weight === "high"
                                  ? "border-red-500/30 text-red-400"
                                  : "border-amber-500/30 text-amber-400"
                              }`}
                            >
                              {factor.weight}
                            </Badge>
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Additional Review Flag */}
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                      <Checkbox
                        id="review"
                        checked={requiresReview}
                        onCheckedChange={(checked) => setRequiresReview(checked as boolean)}
                      />
                      <Label htmlFor="review" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-purple-400" />
                          <span className="font-medium">Flag for additional compliance review</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Application will be queued for secondary review by compliance team
                        </p>
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-6 mt-0">
                {/* Decision Notes */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-400" />
                      Decision Notes
                    </CardTitle>
                    <CardDescription>
                      {decision === "reject" 
                        ? "Provide detailed reason for rejection (required)" 
                        : "Add any additional notes or observations"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        decision === "approve"
                          ? "Optional: Add any notes about the approval..."
                          : decision === "reject"
                            ? "Required: Explain the reason for rejection in detail..."
                            : "Add notes about your decision..."
                      }
                      rows={8}
                      className="bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20"
                    />

                    {/* Character count */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{notes.length} characters</span>
                      {notes.length < 20 && decision === "reject" && (
                        <span className="text-amber-400">
                          Minimum 20 characters required for rejection
                        </span>
                      )}
                    </div>

                    {/* Notification Option */}
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                      <Checkbox
                        id="notify"
                        checked={notifyApplicant}
                        onCheckedChange={(checked) => setNotifyApplicant(checked as boolean)}
                      />
                      <Label htmlFor="notify" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-400" />
                          <span className="font-medium">Notify applicant via email</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Send automated email with decision and notes
                        </p>
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {decision && (
                  <Badge
                    variant="secondary"
                    className={`
                      ${decision === "approve"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    `}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {decision === "approve" ? "Approving" : "Rejecting"}
                  </Badge>
                )}
                {riskLevel !== "low" && (
                  <Badge
                    variant="secondary"
                    className={`
                      ${riskLevel === "high"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }
                    `}
                  >
                    {riskLevel.toUpperCase()} RISK
                  </Badge>
                )}
                {requiresReview && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Flag className="h-3 w-3 mr-1" />
                    Review Required
                  </Badge>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="border-white/20 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    isLoading ||
                    !decision ||
                    (decision === "reject" && notes.trim().length < 20) ||
                    (decision === "approve" && !canApprove)
                  }
                  className={`
                    min-w-[160px]
                    ${decision === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : decision === "reject"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {decision === "approve" ? (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      ) : decision === "reject" ? (
                        <XCircle className="mr-2 h-4 w-4" />
                      ) : null}
                      {decision
                        ? `${decision === "approve" ? "Approve" : "Reject"} Application`
                        : "Make Decision"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

// Info Row Component
const InfoRow: React.FC<{
  label: string
  value: string
  icon?: React.ElementType
}> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3" />}
      {label}:
    </span>
    <span className="font-medium text-right">{value}</span>
  </div>
)