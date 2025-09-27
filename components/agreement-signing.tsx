"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  FileText, 
  PenTool, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Download,
  Building,
  Calendar
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Agreement {
  id: string
  agreement_type: string
  agreement_version: string
  agreement_content: string
  status: string
  presented_at: string
  counterparty_user_id?: string | number | null
  counterparty_email?: string | null
  counterparty_company_name?: string | null
}

interface AgreementSigningProps {
  agreement: Agreement
  onSigned: () => void
}

const getAgreementTitle = (type: string): string => {
  const titles: Record<string, string> = {
    supplier_terms: "Supplier Terms and Conditions",
    buyer_terms: "Buyer Terms and Conditions",
    facility_agreement: "Facility Agreement",
  }
  return titles[type] || "Agreement"
}

export function AgreementSigning({ agreement, onSigned }: AgreementSigningProps) {
  const { toast } = useToast()
  const [signatoryName, setSignatoryName] = useState("")
  const [signatoryTitle, setSignatoryTitle] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const validateForm = (): boolean => {
    if (!signatoryName.trim()) {
      setError("Please enter your full name")
      return false
    }

    if (!agreed) {
      setError("Please confirm that you agree to the terms")
      return false
    }

    setError("")
    return true
  }

  const handleSignClick = () => {
    if (validateForm()) {
      setShowConfirmDialog(true)
    }
  }

  const handleConfirmSign = async () => {
    setLoading(true)
    setError("")
    setShowConfirmDialog(false)

    try {
      const response = await fetch(`/api/agreements/${agreement.id}/sign`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatory_name: signatoryName,
          signatory_title: signatoryTitle,
          signature_method: "electronic",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to sign agreement")
      }

      toast({
        title: "Agreement Signed Successfully",
        description: "Your electronic signature has been recorded",
      })

      onSigned()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Signature Failed",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    // Create downloadable text file
    const blob = new Blob([agreement.agreement_content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${getAgreementTitle(agreement.agreement_type)}_v${agreement.agreement_version}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      {/* Agreement Header */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-blue-500" />
                {getAgreementTitle(agreement.agreement_type)}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>Version {agreement.agreement_version}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Presented {new Date(agreement.presented_at).toLocaleDateString()}
                </span>
                {agreement.counterparty_company_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {agreement.counterparty_company_name}
                    </span>
                  </>
                )}
              </CardDescription>
            </div>
            <Button 
              onClick={handleDownload}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Agreement Content */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Agreement Terms</CardTitle>
          <CardDescription>Please review the complete agreement below</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border p-6 bg-muted/30">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {agreement.agreement_content}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-blue-500" />
            Electronic Signature
          </CardTitle>
          <CardDescription>
            Provide your signature details to complete the agreement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signatory-name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signatory-name"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Enter your full legal name"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signatory-title">Title/Position</Label>
              <Input
                id="signatory-title"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="e.g., CEO, Director, Manager"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border border-border/50">
            <Checkbox
              id="agreement-consent"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              disabled={loading}
              className="mt-1"
            />
            <Label 
              htmlFor="agreement-consent" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I have read, understood, and agree to be bound by the terms and conditions of this agreement. 
              I confirm that I have the authority to sign this agreement on behalf of my organization.
            </Label>
          </div>

          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Shield className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-900">
              Your electronic signature will be legally binding and equivalent to a handwritten signature.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleSignClick}
            disabled={loading || !signatoryName.trim() || !agreed}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {loading ? (
              <>Signing Agreement...</>
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-2" />
                Sign Agreement Electronically
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Electronic Signature</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to electronically sign:</p>
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <p><strong>Agreement:</strong> {getAgreementTitle(agreement.agreement_type)}</p>
                <p><strong>Version:</strong> {agreement.agreement_version}</p>
                <p><strong>Signatory:</strong> {signatoryName}</p>
                {signatoryTitle && <p><strong>Title:</strong> {signatoryTitle}</p>}
              </div>
              <p className="text-muted-foreground">
                This action cannot be undone. Your signature will be legally binding.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSign}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm & Sign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}