"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

const LogoIcon = ({ className = "w-8 h-8 text-blue-600" }) => (
  <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
    <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
    <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
  </svg>
)

export default function ForgotPasswordPage() {
  const router = useRouter()
  let params: ReturnType<typeof useSearchParams> | null = null
  try {
    params = useSearchParams()
  } catch {
    params = null
  }
  const prefillEmail = params?.get("email") || ""
  const returnTo = params?.get("returnTo") || ""

  const [email, setEmail] = useState(prefillEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [sent, setSent] = useState(false)

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo)
    } else {
      router.push("/auth/login")
    }
  }

  const handleSend = async () => {
    setError("")
    if (!email) {
      setError("Email is required")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, purpose: "password_reset" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to send reset code")
        return
      }
      setSent(true)
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&purpose=password_reset`)
      }, 1200)
    } catch (e) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      </div>
      <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <LogoIcon className="w-8 h-8 text-blue-600" />
              <span className="font-bold">Future</span>
              <div className="w-px h-5 bg-blue-600" />
              <span className="font-bold whitespace-nowrap"> Finance Cashflow</span>
            </div>
            <div className="w-8" />
          </div>
          <div className="mb-6">
            <div className="p-4 rounded-full border border-border bg-muted inline-block">
              {sent ? (
                <CheckCircle className="h-12 w-12 text-blue-600" />
              ) : (
                <Mail className="h-12 w-12 text-blue-600" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription className="text-base">
            Enter your email and we'll send you a 6-digit code to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={isLoading}
              autoComplete="email"
              className={`form-input transition-colors ${email ? "bg-muted" : ""}`}
            />
          </div>

          <Button
            onClick={handleSend}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : sent ? "Code Sent" : "Send reset code"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
