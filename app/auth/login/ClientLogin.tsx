"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Eye, EyeOff, Loader2, ArrowLeft, LogIn, LogOut, AlertTriangle, 
  CheckCircle, Clock, XCircle, Shield, Mail, User, Building2
} from "lucide-react"

// Modern Logo Component
const LogoIcon = ({ className = "w-10 h-10 text-primary" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

interface LoginResponse {
  requiresVerification: any
  lockoutMinutes: any
  error: string
  message: string
  user: {
    id: string
    email: string
    role: string
    emailVerified: boolean
  }
  redirectTo: string
  dashboardAccess: {
    canAccess: boolean
    requiredStep?: string
    currentLevel?: string
    completionStatus?: {
      kycCompleted: boolean
      bankingSubmitted: boolean
      agreementsSigned: boolean
    }
  }
  onboardingRequired?: boolean
  nextStepMessage?: string
}

export default function ClientLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [isFromFacilityApp, setIsFromFacilityApp] = useState(false)
  const [needsOTP, setNeedsOTP] = useState(false)
  const [loginResponse, setLoginResponse] = useState<LoginResponse | null>(null)
  const [showOnboardingInfo, setShowOnboardingInfo] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const didRedirectRef = useRef(false)
  const sessionCheckRef = useRef(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Session check with better error handling
  useEffect(() => {
    if (sessionCheckRef.current) return
    sessionCheckRef.current = true

    let cancelled = false
    let timeoutId: NodeJS.Timeout

    const checkSession = async () => {
      try {
        if (didRedirectRef.current || needsOTP || loginResponse) {
          setSessionChecked(true)
          return
        }

        const res = await fetch("/api/auth/session", { 
          credentials: "include",
          cache: 'no-cache'
        })

        if (!res.ok) {
          setSessionChecked(true)
          return
        }

        const data = await res.json()

        if (data?.authenticated && data?.user?.role) {
          const role = data.user.role.toLowerCase().trim()

          if (role === "fm_admin" || role === "fa_admin" || role === "admin") {
            timeoutId = setTimeout(() => {
              if (!cancelled && !didRedirectRef.current) {
                didRedirectRef.current = true
                router.replace("/dashboard/admin")
              }
            }, 100)
          } else {
            setSessionChecked(true)
          }
        } else {
          setSessionChecked(true)
        }
      } catch (error) {
        console.error("Session check error:", error)
        setSessionChecked(true)
      }
    }

    const initialDelay = setTimeout(() => {
      if (!cancelled) {
        checkSession()
      }
    }, 50)

    return () => { 
      cancelled = true
      clearTimeout(initialDelay)
      clearTimeout(timeoutId)
      sessionCheckRef.current = false
    }
  }, [router, needsOTP, loginResponse])

  useEffect(() => {
    const emailParam = searchParams?.get("email") || ""
    const returnToParam = searchParams?.get("returnTo")

    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }))
    }

    if (returnToParam) {
      setReturnTo(returnToParam)
      setIsFromFacilityApp(returnToParam.includes("facility-application"))
    }
  }, [searchParams])

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
    }

    return newErrors
  }

  const handleSubmit = async () => {
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors([])

    try {
      const response = await fetch("/api/auth/login", {
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

      const data: LoginResponse = await response.json()

      if (!response.ok) {
        if (data.requiresVerification) {
          setNeedsOTP(true)
          handleOTPRedirect()
          return
        }

        if (response.status === 423) {
          setErrors([`Account locked. ${data.lockoutMinutes ? `Try again in ${data.lockoutMinutes} minutes.` : 'Please try again later.'}`])
          return
        }

        setErrors([data.error || "Login failed"])
        return
      }

      setLoginResponse(data)

      // If the user is a buyer and has already signed agreements, go straight to dashboard
      const isBuyer = (data.user?.role || '').toLowerCase().trim() === 'buyer'
      const buyerAgreementsSigned = !!data.dashboardAccess?.completionStatus?.agreementsSigned
      if (isBuyer && buyerAgreementsSigned) {
        await handleSuccessfulLogin(data)
        return
      }

      if (data.onboardingRequired && !data.dashboardAccess.canAccess) {
        setShowOnboardingInfo(true)
        return
      }

      await handleSuccessfulLogin(data)

    } catch (error) {
      console.error("Login error:", error)
      setErrors(["Network error. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccessfulLogin = async (data: LoginResponse) => {
    if (didRedirectRef.current) return

    let target = data.redirectTo

    if (!target) {
      try {
        const res = await fetch('/api/dashboard/status', { credentials: 'include', cache: 'no-store' })
        if (res.ok) {
          const snap = await res.json()
          const role = (snap?.user?.role || '').toLowerCase().trim()
          const kyc = (snap?.dashboard?.kyc_status || '').toLowerCase().trim()
          const banking = (snap?.dashboard?.banking_status || '').toLowerCase().trim()
          const agreementsSigned = !!snap?.dashboard?.agreements_signed
          if (role === 'fm_admin' || role === 'fa_admin' || role === 'admin') {
            target = '/dashboard/admin'
          } else if (role === 'buyer') {
            target = '/dashboard/buyer'
          } else if (role === 'supplier') {
            // Show onboarding if any step is incomplete
            const kycApproved = kyc === 'approved'
            const bankingDone = banking === 'submitted' || banking === 'verified'
            if (!kycApproved || !bankingDone || !agreementsSigned) {
              setShowOnboardingInfo(true)
              return
            }
            target = '/dashboard/supplier/status'
          } else {
            target = '/dashboard'
          }
        } else {
          const userRole = data.user?.role?.toLowerCase().trim()
          if (userRole === 'fm_admin' || userRole === 'fa_admin' || userRole === 'admin') {
            target = '/dashboard/admin'
          } else if (returnTo) {
            target = `${returnTo}?returnTo=true`
          } else {
            target = '/dashboard'
          }
        }
      } catch {
        const userRole = data.user?.role?.toLowerCase().trim()
        if (userRole === 'fm_admin' || userRole === 'fa_admin' || userRole === 'admin') {
          target = '/dashboard/admin'
        } else if (returnTo) {
          target = `${returnTo}?returnTo=true`
        } else {
          target = '/dashboard'
        }
      }
    }

    try {
      didRedirectRef.current = true
      router.replace(target)
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== target) {
          window.location.replace(target)
        }
      }, 100)
    } catch (error) {
      console.error("Router navigation error:", error)
      if (typeof window !== 'undefined') {
        window.location.replace(target)
      }
    }
  }

  const handleOTPRedirect = () => {
    let otpUrl = `/verify-otp?email=${encodeURIComponent(formData.email)}&purpose=login`

    if (returnTo) {
      otpUrl += `&returnTo=${encodeURIComponent(returnTo)}`
    }

    router.push(otpUrl)
  }

  const handleGoBack = () => {
    if (isFromFacilityApp) {
      router.push("/facility-application")
    } else {
      router.push("/")
    }
  }

  const handleForgotPassword = () => {
    let forgotUrl = `/auth/forgot-password`

    if (formData.email) {
      forgotUrl += `?email=${encodeURIComponent(formData.email)}`
    }

    if (returnTo) {
      forgotUrl += `${formData.email ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`
    }

    router.push(forgotUrl)
  }

  const proceedToOnboarding = async () => {
    try {
      if (loginResponse?.user?.role?.toLowerCase() === 'supplier' && loginResponse?.dashboardAccess?.completionStatus) {
        const cs = loginResponse.dashboardAccess.completionStatus
        if (!cs.kycCompleted) {
          // Not done with KYC
          return
        }
        if (!cs.bankingSubmitted) {
          router.push('/supplier/banking')
          return
        }
        if (!cs.agreementsSigned) {
          // Not done with agreement, go to supplier dashboard for signing
          router.push('/dashboard/supplier')
          return
        }
        // All onboarding steps complete, go to status page
        router.push('/dashboard/supplier/status')
        return
      }

      const res = await fetch('/api/dashboard/status', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const snap = await res.json()
        const role = (snap?.user?.role || '').toLowerCase().trim()
        const kyc = (snap?.dashboard?.kyc_status || '').toLowerCase().trim()
        const banking = (snap?.dashboard?.banking_status || '').toLowerCase().trim()
        const agreementsSigned = !!snap?.dashboard?.agreements_signed

        if (role === 'supplier') {
          if (kyc !== 'approved') {
            return
          }
          if (!(banking === 'pending' || banking === 'verified')) {
            router.push('/supplier/banking')
            return
          }
          if (!agreementsSigned) {
            return
          }
          router.push('/dashboard/supplier/status')
          return
        }

        if (role === 'buyer') {
          router.push('/dashboard/buyer')
          return
        }
      }
      
      if (loginResponse) {
        await handleSuccessfulLogin(loginResponse)
      }
    } catch (e) {
      console.error('Proceed onboarding failed:', e)
      if (loginResponse) {
        await handleSuccessfulLogin(loginResponse)
      }
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch (e) {
      // ignore
    } finally {
      router.replace("/auth/login")
      if (typeof window !== 'undefined') {
        setTimeout(() => window.location.replace('/auth/login'), 50)
      }
    }
  }

  const getStepIcon = (completed: boolean, current: boolean, step?: string, userRole?: string, completionStatus?: any) => {
    // Special case: buyer, agreement step, KYC done, agreement not signed
    if (
      userRole === 'buyer' &&
      step === 'sign_agreements' &&
      completionStatus?.kycCompleted &&
      !completionStatus?.agreementsSigned
    ) {
      // Show blue AlertCircle for pending agreement
      return <AlertTriangle className="h-5 w-5 text-blue-500" />
    }
    if (completed) return <CheckCircle className="h-5 w-5 text-blue-500" />
    if (current) return <Clock className="h-5 w-5 text-blue-500" />
    return <XCircle className="h-5 w-5 text-gray-300" />
  }

  const getStepStatus = (step: string, completionStatus?: any) => {
    if (!completionStatus) return { completed: false, current: false }
    switch (step) {
      case 'complete_kyc':
        return { 
          completed: completionStatus.kycCompleted, 
          current: !completionStatus.kycCompleted 
        }
      case 'submit_banking':
        return { 
          completed: completionStatus.bankingSubmitted, 
          current: completionStatus.kycCompleted && !completionStatus.bankingSubmitted 
        }
      case 'sign_agreements':
        return { 
          completed: completionStatus.agreementsSigned, 
          current: completionStatus.kycCompleted && completionStatus.bankingSubmitted && !completionStatus.agreementsSigned 
        }
      default:
        return { completed: false, current: false }
    }
  }

  // Modern loading state
  if (!sessionChecked && !needsOTP && !showOnboardingInfo) {
    return (
  <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
        </div>
        <div className="text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 rounded-full border border-border bg-muted">
              <LogoIcon className="w-12 h-12 text-primary" />
            </div>
            
            <div className="flex items-baseline space-x-3">
              <h1 className="text-3xl font-bold text-primary">Future</h1>
              <div className="w-px h-6 bg-primary/70" />
              <span className="text-2xl font-light text-muted-foreground whitespace-nowrap"> Finance Cashflow</span>
            </div>
            
            <div className="flex space-x-2 mt-8">
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce delay-200"></div>
            </div>
            
            <p className="text-sm text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  // OTP verification state
  if (needsOTP) {
    return (
  <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
        </div>
        <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full border border-border bg-muted">
                <Mail className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Verification Required</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification code to your email address. Please check your inbox to complete the login process.
              {isFromFacilityApp && " You'll be redirected back to your facility application after verification."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="rounded-xl p-4 border border-border bg-muted">
                <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">
                  Check your email: <span className="font-bold">{formData.email}</span>
                </p>
              </div>

              {returnTo && (
                <div className="rounded-xl p-4 border border-border bg-muted">
                  <p className="text-sm font-medium">
                    After verification, you'll automatically return to continue your application.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">Redirecting to verification page...</p>

              <div className="flex justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Onboarding info state
  if (showOnboardingInfo && loginResponse) {
    const userRole = loginResponse.user.role
    const completionStatus = loginResponse.dashboardAccess.completionStatus
    const canContinue = !!completionStatus?.kycCompleted
    
    return (
  <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
        </div>
        {/* Top-right status + logout */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {!canContinue && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Clock className="h-3.5 w-3.5" />
              Awaiting KYC Approval
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8 rounded-full border-border bg-muted text-foreground hover:bg-gray-100"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Logout
          </Button>
        </div>
        <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full border border-border bg-muted">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Login Successful!</CardTitle>
            <CardDescription className="text-base">
              Welcome back! You have a few steps to complete before accessing your {userRole} dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(loginResponse.nextStepMessage || (userRole === 'buyer' && !completionStatus?.agreementsSigned)) && (
              <Alert className="border-info bg-info/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {loginResponse.nextStepMessage || (
                    userRole === 'buyer' && completionStatus?.kycCompleted && !completionStatus?.agreementsSigned
                      ? 'Please sign your buyer agreement to continue with the onboarding process.'
                      : 'Please submit your banking details to continue with the onboarding process.'
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground text-center">Completion Progress</h4>
              <div className="space-y-3">
                {/* KYC Step (always show) */}
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  {getStepIcon(
                    getStepStatus('complete_kyc', completionStatus).completed,
                    getStepStatus('complete_kyc', completionStatus).current,
                    'complete_kyc',
                    userRole,
                    completionStatus
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Complete KYC Verification</p>
                    <p className="text-xs text-muted-foreground">Submit required documents</p>
                  </div>
                </div>
                {/* Banking Step (for suppliers only) */}
                {userRole === 'supplier' && (
                  <div className={`flex items-center space-x-3 p-3 rounded-lg ${completionStatus?.kycCompleted && !completionStatus?.bankingSubmitted ? 'bg-info/10 border border-info' : 'bg-muted'}`}>
                    {getStepIcon(
                      getStepStatus('submit_banking', completionStatus).completed,
                      getStepStatus('submit_banking', completionStatus).current,
                      'submit_banking',
                      userRole,
                      completionStatus
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${completionStatus?.kycCompleted && !completionStatus?.bankingSubmitted ? 'text-info font-bold' : 'text-foreground'}`}>Submit Banking Details</p>
                      <p className={`text-xs ${completionStatus?.kycCompleted && !completionStatus?.bankingSubmitted ? 'text-info' : 'text-muted-foreground'}`}>Provide bank account information</p>
                      {(completionStatus?.kycCompleted && !completionStatus?.bankingSubmitted) && (
                        <span className="inline-block mt-1 text-xs text-info font-semibold">Pending</span>
                      )}
                    </div>
                  </div>
                )}
                {/* Agreement Step (always show) */}
                <div className={`flex items-center space-x-3 p-3 rounded-lg ${completionStatus?.bankingSubmitted && !completionStatus?.agreementsSigned ? 'bg-info/10 border border-info' : 'bg-muted'}`}>
                  {getStepIcon(
                    getStepStatus('sign_agreements', completionStatus).completed,
                    getStepStatus('sign_agreements', completionStatus).current,
                    'sign_agreements',
                    userRole,
                    completionStatus
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${completionStatus?.bankingSubmitted && !completionStatus?.agreementsSigned ? 'text-info font-bold' : 'text-foreground'}`}>Sign {userRole === 'supplier' ? 'Supplier' : 'Buyer'} Agreement</p>
                    <p className={`text-xs ${completionStatus?.bankingSubmitted && !completionStatus?.agreementsSigned ? 'text-info' : 'text-muted-foreground'}`}>Review and sign terms</p>
                    {(completionStatus?.bankingSubmitted && !completionStatus?.agreementsSigned) && (
                      <span className="inline-block mt-1 text-xs text-info font-semibold">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 border border-border bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Next Steps</span>
              </div>
              <p className="text-sm text-muted-foreground">Complete the required steps to unlock your full dashboard access.</p>
            </div>

            <Button 
              onClick={proceedToOnboarding}
              disabled={!canContinue}
              className="w-full bg-primary hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground text-foreground font-semibold py-3 rounded-xl transition-colors"
              title={!canContinue ? "Awaiting KYC approval from admin" : undefined}
            >
              {canContinue ? "Continue to Complete Setup" : "Awaiting KYC Approval"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main login form
  return (
  <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      </div>
  <Card className="w-full max-w-md bg-card border border-border shadow-sm text-foreground">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            {(isFromFacilityApp || returnTo) && (
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
            {isFromFacilityApp ? "Sign In to Continue" : "Welcome Back"}
          </CardTitle>

          <CardDescription className="text-base">
            {isFromFacilityApp
              ? "Sign in to your account to continue with your facility application"
              : "Sign in to your account to access your dashboard"}
          </CardDescription>

          {isFromFacilityApp && (
            <div className="mt-4 rounded-xl p-4 border border-border bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">Your Data is Safe</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your application data is safely stored and will be restored after login.
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {errors.length > 0 && (
              <Alert variant="destructive" className="border-error bg-error/10">
                <AlertTriangle className="h-4 w-4" />
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
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Forgot your password?
                  </button>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full bg-primary hover:bg-primary/80 text-foreground font-semibold py-3 rounded-xl transition-colors disabled:hover:!bg-primary/80" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : isFromFacilityApp ? (
                "Sign In & Continue"
              ) : (
                "Sign In"
              )}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href={
                returnTo
                  ? `/register?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(formData.email)}`
                  : "/register"
              }
              className="font-medium text-primary hover:underline"
            >
              Create account
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
                  Access your invitation
                </Link>
              </p>
            </div>
          )}

          {isFromFacilityApp && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="text-center space-y-3">
                <p className="text-xs text-muted-foreground">New to our platform?</p>
                <Link
                    href={`/register?returnTo=${encodeURIComponent(returnTo || "")}&email=${encodeURIComponent(formData.email)}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                  <User className="h-4 w-4" />
                  Create a new account instead
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}