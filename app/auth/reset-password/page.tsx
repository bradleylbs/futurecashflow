"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Shield, CheckCircle } from "lucide-react"

const LogoIcon = ({ className = "w-8 h-8 text-blue-600" }) => (
  <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
    <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
    <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
  </svg>
)

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params?.get("email") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!email) {
      router.replace("/auth/forgot-password")
    }
  }, [email, router])

  const validate = () => {
    const e: string[] = []
    if (!password) e.push("Password is required")
    if (password.length < 8) e.push("Password must be at least 8 characters long")
    if (password !== confirm) e.push("Passwords do not match")
    return e
  }

  const handleSave = async () => {
    const v = validate()
    if (v.length) {
      setErrors(v)
      return
    }
    setIsLoading(true)
    setErrors([])
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors([data.error || "Failed to reset password"])
        return
      }
      setSuccess(true)
      setTimeout(() => router.replace(`/auth/login?email=${encodeURIComponent(email)}`), 1500)
    } catch (e) {
      setErrors(["Network error. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-black text-white px-4">
        <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <LogoIcon className="w-8 h-8 text-blue-600" />
              <span className="font-bold">Future</span>
              <div className="w-px h-5 bg-blue-600" />
              <span className="font-bold whitespace-nowrap"> Finance Cashflow</span>
            </div>
            <CheckCircle className="h-16 w-16 text-blue-600 mx-auto mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold mb-3">Password updated!</h2>
            <p className="text-muted-foreground mb-6 text-lg">Redirecting to sign in…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white px-4">
      <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <LogoIcon className="w-8 h-8 text-blue-600" />
            <span className="font-bold">Future</span>
            <div className="w-px h-5 bg-blue-600" />
            <span className="font-bold whitespace-nowrap">Finance Cashflow</span>
          </div>
          <div className="mb-4">
            <Shield className="h-12 w-12 text-blue-600 mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Create a new password</CardTitle>
          <CardDescription className="text-base">for {email}</CardDescription>
        </CardHeader>
        <CardContent>
          {errors.length > 0 && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 mb-4">
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={show1 ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                required
                disabled={isLoading}
                className="form-input pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShow1(!show1)}
                disabled={isLoading}
              >
                {show1 ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2 mt-3">
            <Label htmlFor="confirm" className="text-sm font-semibold">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirm"
                name="confirm"
                type={show2 ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your new password"
                required
                disabled={isLoading}
                className="form-input pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShow2(!show2)}
                disabled={isLoading}
              >
                {show2 ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSave}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save new password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
