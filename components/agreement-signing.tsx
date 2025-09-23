"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, PenTool, Shield } from "lucide-react"

interface Agreement {
  id: string
  agreement_type: string
  agreement_version: string
  agreement_content: string
  status: string
  presented_at: string
  // Optional counterparty context fields (buyer information)
  counterparty_user_id?: string | number | null
  counterparty_email?: string | null
  counterparty_company_name?: string | null
}

interface AgreementSigningProps {
  agreement: Agreement
  onSigned: () => void
}

export function AgreementSigning({ agreement, onSigned }: AgreementSigningProps) {
  const [signatoryName, setSignatoryName] = useState("")
  const [signatoryTitle, setSignatoryTitle] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSign = async () => {
    if (!signatoryName.trim()) {
      setError("Please enter your full name")
      return
    }

    if (!agreed) {
      setError("Please confirm that you agree to the terms")
      return
    }

    setLoading(true)
    setError("")

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

      onSigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getAgreementTitle = (type: string) => {
    const titles = {
      supplier_terms: "Supplier Terms and Conditions",
      buyer_terms: "Buyer Terms and Conditions",
      facility_agreement: "Facility Agreement",
    }
    return titles[type as keyof typeof titles] || "Agreement"
  }

  return (
    <div className="space-y-8">
      {/* Agreement Preview */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
            <FileText className="h-6 w-6 text-blue-500" />
            {getAgreementTitle(agreement.agreement_type)}
          </CardTitle>
          <CardDescription className="text-gray-700 font-medium">
            Version {agreement.agreement_version} &bull; Presented on {new Date(agreement.presented_at).toLocaleDateString()}
            {agreement.counterparty_user_id && (
              <>
                {' '}
                &bull; Buyer: {agreement.counterparty_company_name || agreement.counterparty_email}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto border-0 rounded-xl p-6 bg-gradient-to-br from-gray-50/80 to-white/80 backdrop-blur-sm shadow-inner">
            <div className="whitespace-pre-wrap text-base text-gray-800">{agreement.agreement_content}</div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Section */}
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <PenTool className="h-5 w-5 text-purple-600" />
            Electronic Signature
          </CardTitle>
          <CardDescription className="text-gray-700">Please provide your signature details to complete the agreement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur border-0 shadow-lg rounded-xl">
              <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="signatory-name" className="font-semibold text-gray-800">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="signatory-name"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Enter your full legal name"
                disabled={loading}
                className="bg-white/80 border-0 shadow-inner rounded-lg focus:ring-2 focus:ring-blue-400/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signatory-title" className="font-semibold text-gray-800">Title/Position</Label>
              <Input
                id="signatory-title"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="e.g., CEO, Director, Manager"
                disabled={loading}
                className="bg-white/80 border-0 shadow-inner rounded-lg focus:ring-2 focus:ring-blue-400/40"
              />
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-xl border-0 shadow-inner">
            <Checkbox
              id="agreement-consent"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              disabled={loading}
              className="mt-1"
            />
            <Label htmlFor="agreement-consent" className="text-sm leading-relaxed text-gray-700">
              I have read, understood, and agree to be bound by the terms and conditions of this agreement. I confirm
              that I have the authority to sign this agreement on behalf of my organization.
            </Label>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-100/80 to-purple-100/80 rounded-xl border-0 shadow-inner">
            <Shield className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-900 font-medium">
              Your electronic signature will be legally binding and equivalent to a handwritten signature.
            </p>
          </div>

          <Button
            onClick={handleSign}
            disabled={loading || !signatoryName.trim() || !agreed}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50"
            size="lg"
          >
            {loading ? "Signing Agreement..." : "Sign Agreement Electronically"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
