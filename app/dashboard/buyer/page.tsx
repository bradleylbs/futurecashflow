"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, AlertTriangle, RefreshCw, LogOut } from "lucide-react"
import { AgreementList } from "@/components/agreement-list"
import { AgreementSigning } from "@/components/agreement-signing"
import { InviteSupplierDialog } from "@/components/invite-supplier-dialog"
import { AssignVendorsDialog } from "@/components/assign-vendors-dialog"
import { InvitationsTable } from "@/components/invitations-table"
import { APUpload } from "@/components/ap-upload"
import { Input } from "@/components/ui/input"

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
    submitted_at?: string
    decided_at?: string
    agreement_signing_date?: string
  }
  documents: {
    total_documents: number
    verified_documents: number
    rejected_documents: number
  }
}

export default function BuyerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedAgreement, setSelectedAgreement] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<string>("agreements")
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesError, setInvoicesError] = useState("")
  const [consentedVendors, setConsentedVendors] = useState<string[]>([])
  const [vendorsLoading, setVendorsLoading] = useState(false)

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/status", { credentials: "include", cache: "no-store" })
      if (response.status === 401) {
        // Not authenticated on this host (e.g., switched from localhost to dev tunnel)
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

  useEffect(() => {
    if (!loading && data) {
      // Default to Agreements until signed; switch to Operations after activation
      const unlocked = data.dashboard.access_level === "agreement_signed" 
        || data.dashboard.access_level === "banking_verified"
        || data.dashboard.agreement_status === "signed"
      if (unlocked) {
        setActiveTab("operations")
      } else {
        setActiveTab("agreements")
      }
    }
  }, [loading, data])

  useEffect(() => {
    if (activeTab === 'operations') {
      ;(async () => {
        try {
          setInvoicesLoading(true)
          setInvoicesError("")
          const res = await fetch('/api/buyer/invoices', { credentials: 'include' })
          if (!res.ok) throw new Error(await res.text())
          const payload = await res.json()
          setInvoices(Array.isArray(payload.invoices) ? payload.invoices : [])
        } catch (e) {
          setInvoices([])
          setInvoicesError('Failed to load invoices')
          console.error('Invoices fetch error:', e)
        } finally {
          setInvoicesLoading(false)
        }
      })()

      // Load consented vendors list for gating uploads
      ;(async () => {
        try {
          setVendorsLoading(true)
          const res = await fetch('/api/buyer/vendors', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            setConsentedVendors(Array.isArray(data?.vendors) ? data.vendors : [])
          } else {
            setConsentedVendors([])
          }
        } catch {
          setConsentedVendors([])
        } finally {
          setVendorsLoading(false)
        }
      })()
    }
  }, [activeTab])

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
              <span className="text-2xl font-light text-muted-foreground whitespace-nowrap"> Finance Cashflow</span>
            </div>
            <div className="flex space-x-2 mt-4">
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce delay-200"></div>
            </div>
            <p className="text-sm text-muted-foreground">Loading buyer dashboard…</p>
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

  const canInviteSuppliers = data.dashboard.access_level === "agreement_signed" 
    || data.dashboard.access_level === "banking_verified"
    || data.dashboard.agreement_status === "signed"
  const supplierInvitesEnabled = canInviteSuppliers


  // Onboarding steps for buyer
  const onboardingSteps = [
    { key: 'kyc', label: 'Complete KYC Verification', complete: data.dashboard.kyc_status === 'approved' },
    { key: 'agreement', label: 'Sign Buyer Agreement', complete: data.dashboard.agreement_status === 'signed' },
  ];
  // Find the next incomplete step
  const nextStepIndex = onboardingSteps.findIndex(step => !step.complete);

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
            <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
            {data.dashboard.company_name && (
              <p className="text-muted-foreground">Welcome, {data.dashboard.company_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchDashboardData}
              style={{ height: '2.25rem', borderRadius: '9999px', background: '#3594f7', color: '#fefefe', padding: '0 1rem', fontWeight: 500 }}
              onMouseOver={e => (e.currentTarget.style.background = '#2176c7')}
              onMouseOut={e => (e.currentTarget.style.background = '#3594f7')}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              style={{ height: '2.25rem', borderRadius: '9999px', background: '#3594f7', color: '#fefefe', padding: '0 1rem', fontWeight: 500 }}
              onMouseOver={e => (e.currentTarget.style.background = '#2176c7')}
              onMouseOut={e => (e.currentTarget.style.background = '#3594f7')}
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

        {/* Onboarding Progress Section */}
        <Card className="mb-6 bg-card border border-border">
          <CardHeader>
            <CardTitle>Login Successful!</CardTitle>
            <CardDescription>
              Welcome back! You have a few steps to complete before accessing your buyer dashboard.<br />
              <span className="font-semibold">Please complete the next step to continue with the onboarding process.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="font-semibold mb-2">Completion Progress</div>
              <ol className="space-y-2">
                {onboardingSteps.map((step, idx) => (
                  <li key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step.complete ? '#2ecc40' : idx === nextStepIndex ? '#3594f7' : '#b8b6b4', fontWeight: idx === nextStepIndex ? 700 : 400 }}>
                    <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: step.complete ? '#2ecc40' : idx === nextStepIndex ? '#3594f7' : '#b8b6b4' }}></span>
                    {step.label}
                    {step.complete && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#2ecc40' }}>(Completed)</span>}
                    {idx === nextStepIndex && !step.complete && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#3594f7' }}>(Next Step)</span>}
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-4">
              <div className="font-semibold mb-1">Next Steps</div>
              <div className="text-sm text-muted-foreground">
                Complete the required steps to unlock your full dashboard access.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activation banner */}
        {supplierInvitesEnabled && (
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Supplier Invitation Capabilities Enabled
              </CardTitle>
              <CardDescription>Invite suppliers to connect and share data securely.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger id="agreements-tab-trigger" value="agreements">Agreements</TabsTrigger>
            {canInviteSuppliers && <TabsTrigger value="suppliers">Suppliers</TabsTrigger>}
            {canInviteSuppliers && <TabsTrigger value="operations">Operations</TabsTrigger>}
          </TabsList>

        {/* Agreements */}
          <TabsContent value="agreements" className="space-y-4">
            <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle>Your Agreements</CardTitle>
              <CardDescription>Review and sign your facility agreement with <span className="font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Cashflow</span></CardDescription>
            </CardHeader>
            <CardContent>
              {data.dashboard.access_level === "kyc_approved" && data.dashboard.agreement_status !== "signed" && (
                <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-900">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your KYC application has been approved. Please sign your facility agreement with <span className="font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Cashflow</span> to unlock features.
                  </AlertDescription>
                </Alert>
              )}
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

          <TabsContent value="suppliers" className="space-y-4">
            <Card className="bg-card border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Supplier Invitations</CardTitle>
                  <CardDescription>
                    Send invitations via email with a secure Mine Code and sign-up link. Track status as suppliers open,
                    register, and complete agreements.
                  </CardDescription>
                </div>
                <InviteSupplierDialog onInviteSent={() => { /* optionally refresh invitations */ }} />
              </div>
            </CardHeader>
            <CardContent>
              <InvitationsTable />
            </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle>Operational Access</CardTitle>
              <CardDescription>
                Invoices and supplier operations. Only consented suppliers' invoice data will be ingested into the
                <span className="font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent"> Future Cashflow</span> system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setActiveTab('suppliers')} variant="outline" style={{ borderColor: '#3d3d3d', background: '#b8b6b4', color: '#727272' }}>
                  Manage Suppliers
                </Button>
          <Button onClick={() => setActiveTab('operations')} style={{ background: '#3594f7', color: '#fefefe' }} onMouseOver={e => (e.currentTarget.style.background = '#2176c7')} onMouseOut={e => (e.currentTarget.style.background = '#3594f7')}>
                  Refresh Invoices
                </Button>
                <AssignVendorsDialog onAssigned={() => {
                  // refresh vendors list
                  (async () => {
                    try {
                      setVendorsLoading(true)
                      const res = await fetch('/api/buyer/vendors', { credentials: 'include' })
                      if (res.ok) {
                        const data = await res.json()
                        setConsentedVendors(Array.isArray(data?.vendors) ? data.vendors : [])
                      }
                    } finally {
                      setVendorsLoading(false)
                    }
                  })()
                }} />
              </div>
            </CardContent>
            </Card>

          {/* Consented Vendor List */}
            <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle>Consented Vendors</CardTitle>
              <CardDescription>Only these vendor numbers are accepted for uploads (Compliance-first)</CardDescription>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <div className="flex items-center text-gray-600"><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading consented vendors…</div>
              ) : consentedVendors.length === 0 ? (
                <NoVendorsCard onInvite={() => setActiveTab('suppliers')} onAdded={() => {
                  // re-fetch vendors
                  (async () => {
                    try {
                      setVendorsLoading(true)
                      const res = await fetch('/api/buyer/vendors', { credentials: 'include' })
                      if (res.ok) {
                        const data = await res.json()
                        setConsentedVendors(Array.isArray(data?.vendors) ? data.vendors : [])
                      }
                    } finally {
                      setVendorsLoading(false)
                    }
                  })()
                }} />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {consentedVendors.map((v) => (
                    <div key={v} className="rounded border border-border px-2 py-1 bg-muted text-foreground">{v}</div>
                  ))}
                </div>
              )}
            </CardContent>
            </Card>

            {/* AP Data Upload */}
            <APUpload consentedVendors={consentedVendors} buyerId={data.user.id} />

            <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Consented suppliers' invoices (preview). All uploads are audited for compliance.</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="flex items-center text-gray-600"><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading invoices…</div>
              ) : invoicesError ? (
                <Alert variant="destructive"><AlertDescription>{invoicesError}</AlertDescription></Alert>
              ) : invoices.length === 0 ? (
                <div className="text-sm text-gray-600">No invoices available yet.</div>
              ) : (
                <div className="text-sm">{/* TODO: render invoices table when backend is ready */}</div>
              )}
            </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Invite dialog is rendered within Suppliers tab header */}
      </div>
    </div>
  )
}

function NoVendorsCard({ onInvite, onAdded }: { onInvite: () => void; onAdded: () => void }) {
  const [vendor, setVendor] = useState("")
  const [supplierEmail, setSupplierEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function addVendor() {
    if (!vendor.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch('/api/buyer/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vendor_number: vendor.trim(), supplier_email: supplierEmail.trim() || undefined })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to add vendor')
      setVendor("")
      setSupplierEmail("")
      onAdded()
    } catch (e: any) {
      setError(e?.message || 'Failed to add vendor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="text-sm text-muted-foreground">
      <div>No consented vendors yet. Use Supplier Invitations to onboard suppliers or assign vendor numbers to an existing supplier.</div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
  <Button size="sm" onClick={onInvite} style={{ background: '#3594f7', color: '#fefefe' }} onMouseOver={e => (e.currentTarget.style.background = '#2176c7')} onMouseOut={e => (e.currentTarget.style.background = '#3594f7')}>Invite Suppliers</Button>
        <AssignVendorsDialog onAssigned={onAdded} />
        <span className="text-xs text-muted-foreground">or add a single vendor number now</span>
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <Input
          value={vendor}
          onChange={e => setVendor(e.target.value)}
          placeholder="Vendor number (e.g., VEND-1001)"
          className="flex-1 form-input"
        />
        <Input
          value={supplierEmail}
          onChange={e => setSupplierEmail(e.target.value)}
          placeholder="Supplier email (optional)"
          className="flex-1 form-input"
        />
  <Button size="sm" onClick={addVendor} disabled={saving || !vendor.trim()} style={{ background: '#3594f7', color: '#fefefe' }} onMouseOver={e => (e.currentTarget.style.background = '#2176c7')} onMouseOut={e => (e.currentTarget.style.background = '#3594f7')}>{saving ? 'Saving…' : 'Add'}</Button>
      </div>
      {error && <div className="mt-2 text-xs text-red-400" role="alert">{error}</div>}
    </div>
  )
}
