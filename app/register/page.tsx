"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, ArrowLeft, Shield, CheckCircle2, Mail } from "lucide-react"

// Modern Logo Component (brand blue, no gradients)
const LogoIcon = ({ className = "w-10 h-10 text-blue-500" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

export default function RegisterPage() {
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <Card className="w-full max-w-md bg-card border border-border shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full border border-gray-200 bg-gray-50">
                <CheckCircle2 className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Registration Successful!</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Please check your email for a verification code to complete your registration.
              {isFromFacilityApp && " You'll be redirected back to your facility application after verification."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="rounded-xl p-4 border border-gray-200 bg-gray-50">
                <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or click resend on the verification page.
                </p>
              </div>
              {returnTo && (
                <div className="rounded-xl p-4 border border-gray-200 bg-gray-50">
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
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <Card className="w-full max-w-md bg-card border border-border shadow-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            {isFromFacilityApp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <LogoIcon className="w-8 h-8 text-blue-500" />
              <span className="font-bold">Future</span>
              <div className="w-px h-5 bg-blue-500" />
              <span className="font-bold whitespace-nowrap">Finance Cashflow</span>
            </div>
            <div className="flex-1" />
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {isFromFacilityApp ? "Create Account to Continue" : "Create Buyer Account"}
          </CardTitle>
          
          <CardDescription className="text-base text-gray-600">
            {isFromFacilityApp 
              ? "Create an account to save your facility application and continue where you left off"
              : "Register as a buyer to access credit facilities and manage suppliers"
            }
          </CardDescription>
          
          {isFromFacilityApp && (
            <div className="mt-4 rounded-xl p-4 border border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Your Data is Safe</span>
              </div>
              <p className="text-sm text-gray-600">Your application data is safely stored and will be restored after registration.</p>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
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
                disabled={isLoading}
                className={`form-input transition-colors ${formData.email ? "bg-gray-50" : ""}`}
              />
              {formData.email && (
                <p className="text-xs text-gray-600 font-medium">
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
              <p className="text-xs text-gray-500">
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
                isFromFacilityApp ? "Create Account & Continue" : "Create Account"
              )}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              href={returnTo ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(formData.email)}` : "/auth/login"} 
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
            </Link>
          </div>

          {!isFromFacilityApp && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Are you a supplier with an invitation?{" "}
                <Link 
                  href="/register/supplier" 
                  className="font-medium text-blue-600 hover:underline"
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