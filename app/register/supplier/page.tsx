"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, CheckCircle, AlertTriangle, Building, Mail, Clock } from "lucide-react"

// Modern Logo Component (brand blue, no gradients)
const LogoIcon = ({ className = "w-10 h-10 text-blue-600" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

export default function SupplierRegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [invitationData, setInvitationData] = useState<{
    companyName: string
    email: string
    message?: string
    expires_at?: string
  } | null>(null)
  const [invalidInvitationReason, setInvalidInvitationReason] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get("token")

  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationToken) return
      try {
        const res = await fetch(`/api/invitations/validate?token=${encodeURIComponent(invitationToken)}`)
        const data = await res.json()
        if (!res.ok) {
          setInvalidInvitationReason(data.error || "Invalid or expired invitation")
          setInvitationData(null)
          return
        }
        const inv = data.invitation
        setInvitationData({
          companyName: inv.companyName,
          email: inv.email,
          message: inv.message,
          expires_at: inv.expires_at,
        })
        setFormData((prev) => ({ ...prev, email: inv.email || prev.email }))
      } catch {
        setInvalidInvitationReason("Unable to validate invitation. Please try again later.")
      }
    }
    loadInvitation()
  }, [invitationToken, searchParams])

  // Set registration path for automatic company type selection
  useEffect(() => {
    try {
      window.sessionStorage.setItem("registration-path", "/register/supplier")
    } catch {
      // ignore storage errors
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors([])
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.email) {
      newErrors.push("Email is required")
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push("Please enter a valid email address")
    }

    if (!formData.password) {
      newErrors.push("Password is required")
    } else if (formData.password.length < 8) {
      newErrors.push("Password must be at least 8 characters long")
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push("Passwords do not match")
    }

    return newErrors
  }

  const handleSubmit = async () => {
    if (!invitationToken) {
      setErrors(["Invalid or missing invitation token"])
      return
    }

    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors([])

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          invitationToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setErrors(data.details)
        } else {
          setErrors([data.error || "Registration failed"])
        }
        return
      }

      setSuccess(true)
      // Redirect to OTP verification
      router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}&purpose=registration`)
    } catch (error) {
      setErrors(["Network error. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  if (!invitationToken || invalidInvitationReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <Card className="w-full max-w-md bg-card border border-border shadow-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full border border-gray-200 bg-gray-50">
                <AlertTriangle className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Invitation</CardTitle>
            <CardDescription className="text-base text-gray-600">
              {invalidInvitationReason || (
                "This registration link is invalid or has expired. Please contact the buyer who invited you for a new invitation."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link href="/">
                <Button variant="outline">
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <Card className="w-full max-w-md bg-card border border-border shadow-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full border border-gray-200 bg-gray-50">
                <CheckCircle className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Registration Successful!</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Please check your email for a verification code to complete your supplier registration.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <Card className="w-full max-w-md bg-card border border-border shadow-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <LogoIcon className="w-8 h-8 text-blue-600" />
            <span className="font-bold">Future</span>
            <div className="w-px h-5 bg-primary" />
            <span className="font-bold whitespace-nowrap">Finance Cashflow</span>
          </div>
          
          <CardTitle className="text-2xl font-bold">
            Supplier Registration
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Complete your registration to join the cashflow platform as a supplier
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {invitationData && (
            <div className="mb-6 p-6 rounded-xl border border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg border border-gray-200 bg-white">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-semibold">Invitation Details</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <p className="text-sm">
                    <span className="text-gray-600">Invited by:</span>{" "}
                    <span className="font-medium">{invitationData.companyName}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <p className="text-sm">
                    <span className="text-gray-600">Email:</span>{" "}
                    <span className="font-medium">{invitationData.email}</span>
                  </p>
                </div>
                
                {invitationData.message && (
                  <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-sm">
                      <span className="font-medium">Message:</span> "{invitationData.message}"
                    </p>
                  </div>
                )}
                
                {invitationData.expires_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <p className="text-xs text-gray-600">
                      Invitation expires: {new Date(invitationData.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {errors.length > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
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
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
                disabled={!!invitationData?.email || isLoading}
                className={`form-input transition-colors ${invitationData?.email ? "bg-gray-50" : ""}`}
              />
              {invitationData?.email && (
                <p className="text-xs text-gray-600">
                  Email is pre-filled from your invitation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a strong password"
                  required
                  disabled={isLoading}
                  className="form-input pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                  className="form-input pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </Button>
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Supplier Account"
              )}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}