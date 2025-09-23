"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, ArrowLeft, Loader2, LogOut } from "lucide-react"

// LogoIcon matching presentation exactly
const LogoIcon = () => (
  <div className="relative">
    <svg aria-hidden="true" className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 80 80">
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
    return () => { cancelled = true }
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 rounded-full border border-border bg-muted">
              <LogoIcon />
            </div>
            <p className="text-sm text-muted-foreground">Checking access…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"></div>
      </div>
      <Card className="w-full max-w-2xl bg-card border border-border shadow-sm text-foreground">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <LogoIcon />
              <span className="font-bold">Future</span>
              <div className="w-px h-5 bg-blue-500" />
              <span className="font-bold whitespace-nowrap">Finance Cashflow</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="rounded-lg border-border"
                title="Logout"
              >
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <CreditCard className="h-6 w-6 text-blue-600" /> 
            <span>Submit Banking Details</span>
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            {kycApproved
              ? "Your KYC is approved. Provide your banking information to proceed to your dashboard."
              : "Your KYC is pending approval. Banking submission will be enabled once approved."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bank_name" className="text-sm font-semibold">
                  Bank Name *
                </Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  value={bankForm.bank_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your bank name"
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_holder_name" className="text-sm font-semibold">
                  Account Holder Name *
                </Label>
                <Input
                  id="account_holder_name"
                  name="account_holder_name"
                  value={bankForm.account_holder_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter account holder name"
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number" className="text-sm font-semibold">
                  Account Number *
                </Label>
                <Input
                  id="account_number"
                  name="account_number"
                  value={bankForm.account_number}
                  onChange={handleChange}
                  required
                  placeholder="Enter account number"
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routing_number" className="text-sm font-semibold">
                  Routing Number *
                </Label>
                <Input
                  id="routing_number"
                  name="routing_number"
                  value={bankForm.routing_number}
                  onChange={handleChange}
                  required
                  placeholder="Enter routing number"
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={submitting || !kycApproved}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
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