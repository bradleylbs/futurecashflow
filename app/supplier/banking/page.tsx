"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Loader2, Building } from "lucide-react"

// LogoIcon matching presentation exactly
const LogoIcon = () => (
  <div className="relative">
    <svg aria-hidden="true" className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

export default function SupplierBankingPage() {
  const router = useRouter()
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_number: "",
    routing_number: "",
    account_holder_name: "",
  })

  useEffect(() => {
    let cancelled = false
    async function fetchBankingDetails() {
      try {
        const res = await fetch("/api/banking/details", { credentials: "include" })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data) {
          setBankForm({
            bank_name: data.bank_name || "",
            account_number: data.account_number || "",
            routing_number: data.routing_number || "",
            account_holder_name: data.account_holder_name || "",
          })
        }
      } catch {}
    }
    fetchBankingDetails()
    return () => {
      cancelled = true
    }
  }, [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [kycApproved, setKycApproved] = useState<boolean | null>(null)

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {}
    router.replace("/auth/login")
  }

  useEffect(() => {
    let cancelled = false
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/dashboard/status", { credentials: "include", cache: "no-cache" })
        if (!res.ok) throw new Error("status failed")
        const data = await res.json()
        const approved = (data?.dashboard?.kyc_status || "").toLowerCase() === "approved"
        if (!cancelled) setKycApproved(approved)
      } catch {
        if (!cancelled) setKycApproved(false)
      }
    }
    checkStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setBankForm((p) => ({ ...p, [name]: value }))
    setError("")
    setSuccess("")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (kycApproved === false) {
      setError("Your KYC is not approved yet. Please wait for admin approval before submitting banking details.")
      return
    }
    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/banking/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bankForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Failed to submit banking details")
        return
      }
      setSuccess("Banking details submitted. Redirecting to your dashboard...")
      setTimeout(() => router.replace("/dashboard/supplier"), 800)
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (kycApproved === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 rounded-full border border-white/10 bg-white/5">
              <LogoIcon />
            </div>
            <p className="text-sm text-muted-foreground">Checking access…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Banking Details</h2>
          <p className="text-sm text-muted-foreground">
            {kycApproved
              ? "Your KYC is approved. Provide your banking information to proceed."
              : "Your KYC is pending approval. Banking submission will be enabled once approved."}
          </p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <Building className="h-6 w-6 text-primary" />
            Submit Banking Information
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Provide your banking information for payment processing and verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <AlertDescription className="text-green-400">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bank_name" className="text-sm font-semibold text-white">
                  Bank Name *
                </Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  value={bankForm.bank_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your bank name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_holder_name" className="text-sm font-semibold text-white">
                  Account Holder Name *
                </Label>
                <Input
                  id="account_holder_name"
                  name="account_holder_name"
                  value={bankForm.account_holder_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter account holder name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number" className="text-sm font-semibold text-white">
                  Account Number *
                </Label>
                <Input
                  id="account_number"
                  name="account_number"
                  value={bankForm.account_number}
                  onChange={handleChange}
                  required
                  placeholder="Enter account number"
                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routing_number" className="text-sm font-semibold text-white">
                  Routing Number *
                </Label>
                <Input
                  id="routing_number"
                  name="routing_number"
                  value={bankForm.routing_number}
                  onChange={handleChange}
                  required
                  placeholder="Enter routing number"
                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting || !kycApproved}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Banking Details...
                  </>
                ) : (
                  <>
                    {kycApproved ? "Submit Banking Details" : "Awaiting KYC Approval"}
                    <CreditCard className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Your banking information is encrypted and secure. It will be used for payment processing only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
