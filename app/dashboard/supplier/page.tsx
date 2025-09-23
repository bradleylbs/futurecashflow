"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, FileText, CreditCard, CheckCircle, Clock, AlertTriangle, Mail, User, RefreshCw, LogOut } from "lucide-react"
import { KYCApplicationForm } from "@/components/kyc-application-form"
import { AgreementList } from "@/components/agreement-list"
import { AgreementSigning } from "@/components/agreement-signing"
import { EarlyPaymentOffers } from "@/components/early-payment-offers"

interface DashboardData {
  user: {
    id: string
    email: string
    role: string
  }
  dashboard: {
    access_level: string
    features: string[]
    kyc_status: string
    company_name?: string
    agreement_status?: string
    banking_status?: string
    submitted_at?: string
    decided_at?: string
    banking_submission_date?: string
    agreement_signing_date?: string
    banking_verification_date?: string
  }
  documents: {
    total_documents: number
    verified_documents: number
    rejected_documents: number
  }
  invitation?: {
    invited_company_name: string
    invitation_message?: string
    sent_at: string
    buyer_email: string
    buyer_company_name?: string
  }
}

export default function SupplierDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedAgreement, setSelectedAgreement] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [hasPresentedAgreement, setHasPresentedAgreement] = useState(false)
  const [agreementsLoading, setAgreementsLoading] = useState(false)
  const requireAgreementSignature = !!(data && (() => {
    const level = data.dashboard.access_level
    const signed = String(data.dashboard.agreement_status || '').toLowerCase() === 'signed'
    if (hasPresentedAgreement) return true
    if (!signed && (level === 'banking_submitted' || level === 'banking_verified')) return true
    return false
  })())

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/status", { credentials: "include", cache: "no-store" })
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = "/auth/login"
        }
        return
      }
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data")
      }
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (error) {
      setError("Failed to load dashboard data")
      console.error("Dashboard fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  fetchDashboardData()
  }, [])

  // Load agreements and auto-open if any agreement is presented; if required but none exist, auto-present client-side
  useEffect(() => {
    let cancelled = false
    const loadAgreements = async () => {
      try {
        setAgreementsLoading(true)
        const resp = await fetch('/api/agreements', { credentials: 'include' })
        if (!resp.ok) return
        const payload = await resp.json().catch(() => ({}))
        const list: any[] = Array.isArray(payload?.agreements) ? payload.agreements : []
        const presented = list.find(a => a?.status === 'presented')
        if (!cancelled && presented) {
          setHasPresentedAgreement(true)
          setSelectedAgreement(presented)
          setActiveTab('agreements')
        } else if (!cancelled && requireAgreementSignature && list.length === 0) {
          // Client-side safeguard: present supplier_terms if required but none found
          try {
            const createResp = await fetch('/api/agreements', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agreement_type: 'supplier_terms' })
            })
            if (createResp.ok) {
              const again = await fetch('/api/agreements', { credentials: 'include' })
              const againPayload = await again.json().catch(() => ({}))
              const againList: any[] = Array.isArray(againPayload?.agreements) ? againPayload.agreements : []
              const againPresented = againList.find(a => a?.status === 'presented')
              if (againPresented) {
                setHasPresentedAgreement(true)
                setSelectedAgreement(againPresented)
                setActiveTab('agreements')
              }
            }
          } catch (e) {
            console.warn('Auto-present agreement (client) failed:', e)
          }
        }
      } finally {
        if (!cancelled) setAgreementsLoading(false)
      }
    }
    loadAgreements()
    return () => { cancelled = true }
  }, [requireAgreementSignature])

  useEffect(() => {
    if (!loading && data) {
      // If KYC approved but banking not yet submitted/verified, send user to dedicated banking page
      const kycApproved = data.dashboard.kyc_status === 'approved'
      const banking = (data.dashboard.banking_status || '').toLowerCase()
      // If there is a presented agreement, don't redirect away; prioritize signing prompt
      if (!hasPresentedAgreement && kycApproved && !(banking === 'pending' || banking === 'verified')) {
        if (typeof window !== 'undefined') {
          window.location.replace('/supplier/banking')
        }
        return
      }

      // Determine active tab based on access level
      const level = data.dashboard.access_level
      const isAgreementSigned = String(data.dashboard.agreement_status || '').toLowerCase() === 'signed'
      const canAccessOperations = isAgreementSigned
      if (hasPresentedAgreement || requireAgreementSignature) {
        setActiveTab('agreements')
      } else if (level === 'pre_kyc') {
        setActiveTab('overview')
      } else if (level === 'banking_submitted') {
        setActiveTab('agreements')
      } else if (canAccessOperations) {
        setActiveTab('operations')
      } else if (level === 'kyc_approved') {
        // They'll be redirected to banking page; keep overview as fallback
        setActiveTab('overview')
      } else {
        setActiveTab('overview')
      }
    }
  }, [loading, data, hasPresentedAgreement, requireAgreementSignature])

  const getAccessLevelInfo = (level: string) => {
    const levels = {
      pre_kyc: { title: "Getting Started", description: "Complete your KYC application", step: 1, total: 5 },
      kyc_approved: { title: "KYC Approved", description: "Submit banking details", step: 2, total: 5 },
      banking_submitted: { title: "Banking Submitted", description: "Sign agreement", step: 3, total: 5 },
      agreement_signed: { title: "Agreement Signed", description: "Banking verification pending", step: 4, total: 5 },
      banking_verified: { title: "Fully Verified", description: "All features unlocked", step: 5, total: 5 },
    }
    return levels[level as keyof typeof levels] || levels.pre_kyc
  }

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'rejected') return 'bg-red-600/15 text-red-300 border border-border'
    if (s === 'approved' || s === 'signed' || s === 'verified') return 'bg-blue-600/15 text-blue-300 border border-border'
    if (s === 'pending' || s === 'under_review') return 'bg-primary/15 text-primary border border-border'
    return 'bg-muted text-muted-foreground border border-border'
  }

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-black text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
        </div>
        <div className="text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 rounded-full border border-border bg-muted">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="flex items-baseline space-x-3">
              <h1 className="text-3xl font-bold">Future</h1>
              <div className="w-px h-6 bg-primary/70" />
              <span className="text-2xl font-light text-muted-foreground whitespace-nowrap">Finance Cashflow</span>
            </div>
            <div className="flex space-x-2 mt-4">
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce delay-200"></div>
            </div>
            <p className="text-sm text-muted-foreground">Loading supplier dashboard…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>{error || "Failed to load dashboard"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const levelInfo = getAccessLevelInfo(data.dashboard.access_level)
  const progressPercentage = (levelInfo.step / levelInfo.total) * 100
  const isAgreementSigned = String(data.dashboard.agreement_status || '').toLowerCase() === 'signed'
  const canAccessOperations = isAgreementSigned

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      </div>

      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supplier Dashboard</h1>
          <p className="text-muted-foreground">
            {data.dashboard.company_name ? `Welcome, ${data.dashboard.company_name}` : "Complete your onboarding"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchDashboardData}
            className="h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
              } catch {}
              if (typeof window !== 'undefined') window.location.href = '/auth/login'
            }}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Invitation Context */}
      {data.invitation && (
        <Card className="bg-blue-600/10 border border-blue-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-200">
              <Mail className="h-5 w-5" />
              Invitation Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-200">Invited by:</p>
                <p className="text-blue-100">{data.invitation.buyer_company_name || data.invitation.buyer_email}</p>
              </div>
              <div>
                <p className="font-medium text-blue-200">Invitation Date:</p>
                <p className="text-blue-100">{new Date(data.invitation.sent_at).toLocaleDateString()}</p>
              </div>
              {data.invitation.invitation_message && (
                <div className="md:col-span-2">
                  <p className="font-medium text-blue-200">Message:</p>
                  <p className="text-blue-100 italic">"{data.invitation.invitation_message}"</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agreement Prompt */}
      {requireAgreementSignature && !selectedAgreement && (
        <Card className="bg-blue-600/10 border border-blue-700">
          <CardHeader>
            <CardTitle className="text-blue-200">Agreement pending signature</CardTitle>
            <CardDescription className="text-blue-100">A buyer has requested you to sign supplier terms. Please review and sign to activate the relationship.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setActiveTab('agreements')}>Sign Agreement Now</Button>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Onboarding Progress
          </CardTitle>
          <CardDescription>{levelInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{levelInfo.title}</span>
            <span className="text-sm text-muted-foreground">
              Step {levelInfo.step} of {levelInfo.total}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {data.dashboard.kyc_status === "approved" ? (
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-sm font-medium">KYC Status</span>
              </div>
              <Badge className={getStatusColor(data.dashboard.kyc_status)}>
                {data.dashboard.kyc_status?.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            {data.dashboard.banking_status && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm font-medium">Banking</span>
                </div>
                <Badge className={getStatusColor(data.dashboard.banking_status)}>
                  {data.dashboard.banking_status?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            )}

            {data.dashboard.agreement_status && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Agreement</span>
                </div>
                <Badge className={getStatusColor(data.dashboard.agreement_status)}>
                  {data.dashboard.agreement_status?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {(data.dashboard.access_level !== "pre_kyc" || hasPresentedAgreement) && (
            <TabsTrigger id="agreements-tab-trigger" value="agreements">Agreements</TabsTrigger>
          )}
          {canAccessOperations && (
            <TabsTrigger value="operations">Operations</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {data.dashboard.access_level === "pre_kyc" && (
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Complete Your KYC Application</CardTitle>
                <CardDescription>Submit your company information and required documents</CardDescription>
              </CardHeader>
              <CardContent>
                <KYCApplicationForm />
              </CardContent>
            </Card>
          )}

          {data.dashboard.access_level === "kyc_approved" && (
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Submit Banking Details</CardTitle>
                <CardDescription>Provide your banking information for verification</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-900">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your KYC application has been approved. Continue to submit your banking details for verification.
                  </AlertDescription>
                </Alert>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a href="/supplier/banking">Go to Banking</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {data.dashboard.access_level === "banking_submitted" && (
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Sign Agreement</CardTitle>
                <CardDescription>Review and sign the supplier agreement to complete onboarding</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAgreement ? (
                  <AgreementSigning
                    agreement={selectedAgreement}
                    onSigned={() => {
                      setSelectedAgreement(null)
                      fetchDashboardData()
                    }}
                  />
                ) : (
                  <AgreementList onSelectAgreement={(a: any) => setSelectedAgreement(a)} />
                )}
              </CardContent>
            </Card>
          )}

          {canAccessOperations && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    Onboarding Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Congratulations! Your supplier onboarding is complete. You can now access all platform features.
                  </p>
                    {data.dashboard.access_level === "banking_verified" && (
                    <Badge className="mt-2 bg-blue-600/15 text-blue-300 border border-border">Premium Features Unlocked</Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white" asChild>
                    <a href="/dashboard/invoices">
                      <FileText className="mr-2 h-4 w-4" />
                      View Invoices
                    </a>
                  </Button>
                  <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white" asChild>
                    <a href="/dashboard/communication">
                      <User className="mr-2 h-4 w-4" />
                      Contact Buyer
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="agreements" className="space-y-4">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle>Your Agreements</CardTitle>
              <CardDescription>View and manage your signed agreements</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedAgreement ? (
                <AgreementSigning
                  agreement={selectedAgreement}
                  onSigned={() => {
                    setSelectedAgreement(null)
                    fetchDashboardData()
                  }}
                />
              ) : (
                <AgreementList onSelectAgreement={(a: any) => setSelectedAgreement(a)} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Invoice Management</CardTitle>
                <CardDescription>Manage your invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Invoice management features coming soon.</p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a href="/dashboard/invoices">View Invoices</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Buyer Communication</CardTitle>
                <CardDescription>Communicate with your buyer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Communication features coming soon.</p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a href="/dashboard/communication">Send Message</a>
                </Button>
              </CardContent>
            </Card>
          </div>
          <EarlyPaymentOffers />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
