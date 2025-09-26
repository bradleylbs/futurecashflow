"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, CheckCircle, Mail, RefreshCw, Shield } from "lucide-react"

// LogoIcon matching brand accents
const LogoIcon = ({ className = "w-8 h-8 text-blue-600" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")
  const [purpose, setPurpose] = useState("")
  const [countdown, setCountdown] = useState(0)
  
  const router = useRouter()
  const otpInputRef = useRef<HTMLInputElement>(null)

  // Handle URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const emailParam = urlParams.get('email') || ""
      const purposeParam = urlParams.get('purpose') || "registration"
      
      console.log('OTP Verification - URL params:', { emailParam, purposeParam })
      
      setEmail(emailParam)
      setPurpose(purposeParam)
    }
  }, [])

  // Auto-focus OTP input
  useEffect(() => {
    if (otpInputRef.current) {
      otpInputRef.current.focus()
    }
  }, [])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Only allow digits
    if (value.length <= 6) {
      setOtp(value)
      setErrors([])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp || otp.length !== 6) {
      setErrors(["Please enter a valid 6-digit verification code"])
      return
    }

    if (!email) {
      setErrors(["Email address is required"])
      return
    }

    setIsLoading(true)
    setErrors([])

    try {
      console.log('Submitting OTP verification:', { email, otp, purpose })

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, otp, purpose }),
      })

      const data = await response.json()
      console.log('OTP verification response:', { ok: response.ok, data })

      if (!response.ok) {
        setErrors([data.error || "Verification failed"])
        return
      }

      // Success! Show success state and then redirect
      setSuccess(true)
      console.log('OTP verification successful, preparing redirect...')

      // Wait longer to ensure cookie is set properly
      setTimeout(() => {
        handleOTPSuccess()
      }, 3000)
    } catch (error) {
      console.error('OTP verification error:', error)
      setErrors(["Network error. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPSuccess = async () => {
    console.log('Handling OTP success - checking authentication...')
    
    try {
      // CRITICAL FIX: Verify authentication before redirecting
      const authTest = await fetch('/api/auth/session', { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      })
      const authData = await authTest.json()
      
      console.log('Auth test after OTP:', authData)
      
      if (purpose === 'password_reset') {
        // For password reset, proceed to reset page with email param regardless of auth cookie
        window.location.href = `/auth/reset-password?email=${encodeURIComponent(email)}`
        return
      }

      if (authData.authenticated) {
        const role = authData?.user?.role
        if (role === 'fm_admin') {
          console.log('User authenticated as fm_admin, redirecting to /dashboard/admin')
          window.location.href = '/dashboard/admin'
        } else {
          console.log('User authenticated, redirecting to facility application')
          window.location.href = '/facility-application'
        }
      } else {
        console.error('User not authenticated after OTP - auth may have failed')
        // Still redirect but user will need to login again
        window.location.href = '/facility-application'
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Fallback - redirect anyway
      window.location.href = '/facility-application'
    }
  }

  const handleResendOTP = async () => {
    if (!email || countdown > 0) return

    setIsResending(true)
    setErrors([])

    try {
      console.log('Resending OTP to:', email)

      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, purpose }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors([data.error || "Failed to resend verification code"])
        return
      }

      // Start countdown timer
      setCountdown(60)

      // Show success message briefly
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 shadow-lg'
      successMsg.textContent = 'Verification code sent!'
      document.body.appendChild(successMsg)

      setTimeout(() => {
        if (document.body.contains(successMsg)) {
          document.body.removeChild(successMsg)
        }
      }, 3000)
    } catch (error) {
      console.error('Resend OTP error:', error)
      setErrors(["Network error. Please try again."])
    } finally {
      setIsResending(false)
    }
  }

  const handleGoBack = () => {
    if (purpose === "registration") {
      window.location.href = '/register'
    } else {
      window.location.href = '/auth/login'
    }
  }

  const getPurposeText = () => {
    switch (purpose) {
      case "registration":
        return "complete your registration"
      case "login":
        return "log in to your account"
      case "password_reset":
        return "reset your password"
      default:
        return "verify your email"
    }
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-black text-white px-4">
        <Card className="w-full max-w-md bg-card border border-border shadow-sm rounded-3xl text-foreground">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <LogoIcon className="w-8 h-8 text-blue-600" />
              <span className="font-bold">Future</span>
              <div className="w-px h-5 bg-primary" />
              <span className="font-bold whitespace-nowrap">Finance Cashflow</span>
            </div>
            <CheckCircle className="h-16 w-16 text-blue-600 mx-auto mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold mb-3">
              Verification Successful!
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Your email has been verified successfully.
            </p>
            
            <div className="bg-muted rounded-xl p-4 mb-6 border border-border">
              <p className="text-sm text-foreground">
                Account activated! Redirecting you to start your facility application...
              </p>
            </div>
            
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            
            {/* Fallback redirect button in case automatic redirect fails */}
            <Button
              onClick={() => handleOTPSuccess()}
              variant="outline"
              size="sm"
              className="text-xs border-border hover:bg-muted"
            >
              Continue Manually
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white px-4">
      <Card className="w-full max-w-md bg-card border border-border shadow-sm rounded-3xl text-foreground">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="hover:bg-muted transition-all duration-300 p-3 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <LogoIcon className="w-8 h-8 text-blue-600" />
              <span className="font-bold">Future</span>
              <div className="w-px h-5 bg-primary" />
              <span className="font-bold whitespace-nowrap">Finance Cashflow</span>
            </div>
            <div className="w-12" /> {/* Spacer for balance */}
          </div>
          
          <div className="mb-6">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          </div>
          
          <CardTitle className="text-2xl font-bold mb-3">
            Verify Your Email
          </CardTitle>
          
          <CardDescription className="text-muted-foreground text-base">
            Enter the 6-digit verification code sent to <strong className="text-blue-600/80">{email}</strong> to {getPurposeText()}.
          </CardDescription>
          
          <div className="mt-4 bg-muted rounded-xl p-4 border border-border">
            <p className="text-sm text-blue-600/80 font-medium">
              After verification, you'll be redirected to start your facility application.
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.length > 0 && (
              <Alert variant="destructive" className="border-red-600 bg-red-900/50">
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-red-300">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label htmlFor="otp" className="text-center block text-sm font-semibold">
                Verification Code
              </Label>
              <Input
                ref={otpInputRef}
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="000000"
                required
                disabled={isLoading}
                className="text-center text-2xl font-mono tracking-widest rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
              />
              <p className="text-xs text-muted-foreground text-center font-medium">
                Enter the 6-digit code from your email
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 disabled:bg-blue-400" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground mb-4 font-medium">
              Didn't receive the code?
            </p>
            
            <Button
              onClick={handleResendOTP}
              disabled={isResending || countdown > 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 disabled:bg-blue-400"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending New Code...
                </>
              ) : countdown > 0 ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend in {countdown}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Having trouble? Check your spam folder or{" "}
              <Link href="/contact" className="text-blue-600 font-medium underline">
                contact support
              </Link>
            </p>
          </div>
          
          {email && (
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Wrong email address?{" "}
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="text-blue-600 font-medium underline transition-colors duration-200"
                >
                  Go back and change it
                </button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}