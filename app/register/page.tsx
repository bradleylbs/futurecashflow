"use client"

import React, { useState, useEffect, Suspense } from "react"
const Loading = React.lazy(() => import('./loading'));
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, ArrowLeft, Shield, CheckCircle2, Mail, LogIn } from "lucide-react"

// Modern Logo Component (brand blue, no gradients)
const LogoIcon = ({ className = "w-10 h-10 text-blue-500" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

function DelayedRegisterPage() {
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
  const [delayDone, setDelayDone] = useState(false)
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [isFromFacilityApp, setIsFromFacilityApp] = useState(false)
  const router = useRouter()

  // Handle URL parameters and pre-fill email
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const emailParam = urlParams.get('email')
    const returnToParam = urlParams.get('returnTo')
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }))
    }
    if (returnToParam) {
      setReturnTo(returnToParam)
      setIsFromFacilityApp(returnToParam.includes('facility-application'))
    }
    // Set registration path for automatic company type selection
    try {
      window.sessionStorage.setItem("registration-path", "/register")
    } catch {
      // ignore storage errors
    }
    // Artificial delay for loading screen
    const timer = setTimeout(() => setDelayDone(true), 700)
    return () => clearTimeout(timer)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
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
      
      // Build OTP verification URL with return flow
      let otpUrl = `/verify-otp?email=${encodeURIComponent(formData.email)}&purpose=registration`
      
      if (returnTo) {
        otpUrl += `&returnTo=${encodeURIComponent(returnTo)}`
      }
      
      // Redirect to OTP verification
      router.push(otpUrl)
      
    } catch (error) {
      setErrors(["Network error. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = () => {
    if (isFromFacilityApp) {
      router.push('/facility-application')
    } else {
      router.back()
    }
  }

  if (!delayDone) {
    // Show loading screen while delay is not done
    return <Loading />;
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
        </div>
        <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full border border-border bg-muted">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Registration Successful!</CardTitle>
            <CardDescription className="text-base">
              Please check your email for a verification code to complete your registration.
              {isFromFacilityApp && " You'll be redirected back to your facility application after verification."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="rounded-xl p-4 border border-border bg-muted">
                <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or click resend on the verification page.
                </p>
              </div>
              {returnTo && (
                <div className="rounded-xl p-4 border border-border bg-muted">
                  <p className="text-sm font-medium">
                    After verification, you'll automatically return to continue your application.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      </div>
      <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            {(isFromFacilityApp) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="p-2 hover:bg-gray-100 rounded-full"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <LogoIcon className="w-8 h-8 text-primary" />
              <span className="font-bold text-primary">Future</span>
              <div className="w-px h-5 bg-primary" />
              <span className="font-bold whitespace-nowrap text-primary">Finance Cashflow</span>
            </div>
            <div className="flex-1" />
          </div>

          <div className="mb-6">
            <div className="p-4 rounded-full border border-border bg-muted inline-block">
              <LogIn className="h-12 w-12 text-primary" />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold">
            {isFromFacilityApp ? "Create Account to Continue" : "Create Buyer Account"}
          </CardTitle>

          <CardDescription className="text-base">
            {isFromFacilityApp
              ? "Create an account to save your facility application and continue where you left off"
              : "Register as a buyer to access credit facilities and manage suppliers"
            }
          </CardDescription>

          {isFromFacilityApp && (
            <div className="mt-4 rounded-xl p-4 border border-border bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">Your Data is Safe</span>
              </div>
              <p className="text-sm text-muted-foreground">Your application data is safely stored and will be restored after registration.</p>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {errors.length > 0 && (
              <Alert variant="destructive" className="border-error bg-error/10">
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
                disabled={isLoading}
                autoComplete="email"
                className={`form-input transition-colors ${formData.email ? "bg-muted" : ""}`}
              />
              {formData.email && (
                <p className="text-xs text-muted-foreground font-medium">
                  We'll send a verification code to this email address
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
                  autoComplete="new-password"
                  className="form-input pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
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
                  autoComplete="new-password"
                  className="form-input pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </Button>
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/80 text-foreground font-semibold py-3 rounded-xl transition-colors disabled:hover:!bg-primary/80" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                isFromFacilityApp ? "Create Account & Continue" : "Create Account"
              )}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={returnTo ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(formData.email)}` : "/auth/login"}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>

          {!isFromFacilityApp && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Are you a supplier with an invitation?{" "}
                <Link
                  href="/register/supplier"
                  className="font-medium text-primary hover:underline"
                >
                  Register here
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div />}>
      <DelayedRegisterPage />
    </Suspense>
  );
}