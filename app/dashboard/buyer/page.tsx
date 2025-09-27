"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { 
  Users, AlertTriangle, RefreshCw, LogOut, CheckCircle2, 
  Clock, FileText, Building, AlertCircle, Menu, X,
  Upload, Mail, Shield, TrendingUp, ChevronRight, Home,
  Settings, Bell, Activity
} from "lucide-react"
import { AgreementList } from "@/components/agreement-list"
import { AgreementSigning } from "@/components/agreement-signing"
import { InviteSupplierDialog } from "@/components/invite-supplier-dialog"
import { AssignVendorsDialog } from "@/components/assign-vendors-dialog"
import { InvitationsTable } from "@/components/invitations-table"
import { APUpload } from "@/components/ap-upload"
import { BuyerPaymentsTable } from "@/components/buyer-payments-table"

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
    vendor_count?: number
    invoice_count?: number
  }
  documents: {
    total_documents: number
    verified_documents: number
    rejected_documents: number
  }
}

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'blue' | 'green' | 'amber' | 'purple'
}

const colorMap: Record<'blue' | 'green' | 'amber' | 'purple', { bg: string; border: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-500" },
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = "blue"
}) => {
  const colors = colorMap[color]
  
  return (
    <Card className={`${colors.bg} border ${colors.border} transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-3xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${colors.bg} border ${colors.border}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && trendValue && (
            <Badge 
              variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}
              className="gap-1"
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3" aria-hidden="true" />}
              <span>{trendValue}</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const NAVIGATION_SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    icon: Home,
    description: "Dashboard home"
  },
  {
    id: "agreements",
    title: "Agreements",
    icon: FileText,
    description: "Review and sign agreements"
  },
  {
    id: "suppliers",
    title: "Suppliers",
    icon: Users,
    description: "Manage supplier invitations",
    requiresActivation: true
  },
  {
    id: "operations",
    title: "Operations",
    icon: Building,
    description: "Invoice management",
    requiresActivation: true
  }
]

export default function BuyerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedAgreement, setSelectedAgreement] = useState<any | null>(null)
  const [activeView, setActiveView] = useState<string>("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Invoice and vendor stats now come from dashboard API
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<string>("")

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/status", { 
        credentials: "include", 
        cache: "no-store" 
      })
      
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
      setError("")
    } catch (error) {
      setError("Failed to load dashboard data")
      console.error("Dashboard fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, [])


  const handleMatchInvoices = async () => {
    setMatching(true)
    setMatchResult("")
    try {
      const res = await fetch('/api/buyer/invoices/match', { 
        method: 'POST', 
        credentials: 'include' 
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Match failed')
      setMatchResult(`Successfully matched ${data.matched ?? 0} invoices`)
    } catch (e: any) {
      setMatchResult(e?.message || 'Match failed')
    } finally {
      setMatching(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    if (typeof window !== 'undefined') window.location.href = '/auth/login'
  }

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId)
    setSidebarOpen(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // No longer need to fetch invoices/vendors separately for stats

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-blue-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-semibold">Loading Dashboard...</h1>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Failed to load dashboard"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const isActivated = data.dashboard.access_level === "agreement_signed" 
    || data.dashboard.access_level === "banking_verified"
    || data.dashboard.agreement_status === "signed"

  const kycComplete = data.dashboard.kyc_status === 'approved'
  const agreementComplete = data.dashboard.agreement_status === 'signed'

  const currentSection = NAVIGATION_SECTIONS.find(s => s.id === activeView)

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-72 bg-black/95 backdrop-blur-xl 
          border-r border-white/10 z-50 transform transition-transform duration-300 
          flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Buyer Portal</h1>
                <p className="text-xs text-muted-foreground">
                  {data.dashboard.company_name || 'Dashboard'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Buyer sections">
          {NAVIGATION_SECTIONS.map((section) => {
            const SectionIcon = section.icon
            const isActive = activeView === section.id
            const isLocked = section.requiresActivation && !isActivated

            return (
              <button
                key={section.id}
                onClick={() => !isLocked && handleNavClick(section.id)}
                disabled={isLocked}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg 
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : isLocked
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={`
                  p-2 rounded-lg
                  ${isActive ? 'bg-blue-500/20' : 'bg-white/5'}
                `}>
                  <SectionIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium flex items-center gap-2">
                    {section.title}
                    {isLocked && (
                      <AlertCircle className="h-3 w-3" aria-label="Locked" />
                    )}
                  </div>
                  <div className="text-xs opacity-70">{section.description}</div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-green-500" />
            <span>System OK</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/10">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Mobile Menu + Breadcrumb */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
                <span className="text-muted-foreground">Dashboard</span>
                {currentSection && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-white font-medium">{currentSection.title}</span>
                  </>
                )}
              </nav>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={fetchDashboardData}
                size="sm"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                aria-label="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>

              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-xs flex items-center justify-center">
                  2
                </span>
              </Button>

              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Overview */}
          {activeView === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard 
                  title="KYC Status" 
                  value={kycComplete ? 'Approved' : 'Pending'}
                  subtitle="Verification status"
                  icon={Shield}
                  color={kycComplete ? 'green' : 'amber'}
                  trend={kycComplete ? 'up' : undefined}
                  trendValue={kycComplete ? 'Complete' : undefined}
                />
                <StatsCard 
                  title="Agreement" 
                  value={agreementComplete ? 'Signed' : 'Pending'}
                  subtitle="Legal documentation"
                  icon={FileText}
                  color={agreementComplete ? 'green' : 'amber'}
                  trend={agreementComplete ? 'up' : undefined}
                  trendValue={agreementComplete ? 'Complete' : undefined}
                />
                <StatsCard 
                  title="Suppliers" 
                  value={data.dashboard.vendor_count ?? 0}
                  subtitle="Consented vendors"
                  icon={Users}
                  color="blue"
                />
                <StatsCard 
                  title="Invoices" 
                  value={data.dashboard.invoice_count ?? 0}
                  subtitle="Total uploaded"
                  icon={Upload}
                  color="purple"
                />
              </div>

              {/* Onboarding Progress */}
              {!isActivated && (
                <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
                  <CardHeader>
                    <CardTitle>Complete Your Onboarding</CardTitle>
                    <CardDescription>
                      Finish these steps to unlock full dashboard access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={kycComplete && agreementComplete ? 100 : kycComplete ? 50 : 0} className="h-2" />
                    
                    <div className="space-y-3">
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${kycComplete ? 'bg-green-500/10 border border-green-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                        <div className={`p-2 rounded-full ${kycComplete ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Complete KYC Verification</div>
                        </div>
                        {kycComplete && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>

                      <div className={`flex items-center gap-3 p-3 rounded-lg ${agreementComplete ? 'bg-green-500/10 border border-green-500/20' : kycComplete ? 'bg-blue-500/10 border border-blue-500/20' : 'opacity-50'}`}>
                        <div className={`p-2 rounded-full ${agreementComplete ? 'bg-green-500/20 text-green-500' : kycComplete ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Sign Buyer Agreement</div>
                        </div>
                        {agreementComplete ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : kycComplete ? (
                          <Badge variant="secondary" className="bg-blue-600 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            Next Step
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {kycComplete && !agreementComplete && (
                      <Button 
                        onClick={() => handleNavClick('agreements')}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Sign Agreement Now
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Activation Success */}
              {isActivated && (
                <Alert className="border-green-500/30 bg-green-500/5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-400">Account Activated!</AlertTitle>
                  <AlertDescription className="text-green-300">
                    Your account is fully activated. You can now invite suppliers and manage operations.
                  </AlertDescription>
                </Alert>
              )}

              {/* Quick Actions */}
              {isActivated && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks and operations</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-24 flex-col gap-2"
                      onClick={() => handleNavClick('suppliers')}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-sm">Invite Suppliers</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex-col gap-2"
                      onClick={() => handleNavClick('operations')}
                    >
                      <Upload className="h-5 w-5" />
                      <span className="text-sm">Upload Invoices</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex-col gap-2"
                      onClick={handleMatchInvoices}
                      disabled={matching}
                    >
                      {matching ? <RefreshCw className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                      <span className="text-sm">Match Invoices</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex-col gap-2"
                      onClick={() => handleNavClick('operations')}
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">View Payments</span>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Agreements View */}
          {activeView === 'agreements' && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Your Agreements
                </CardTitle>
                <CardDescription>
                  Review and sign your facility agreement with Cashflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                {kycComplete && !agreementComplete && (
                  <Alert className="mb-4 border-blue-500/30 bg-blue-500/5">
                    <AlertTriangle className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-300">
                      Your KYC has been approved. Please sign your agreement to continue.
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
                  <AgreementList onSelectAgreement={setSelectedAgreement} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Suppliers View */}
          {activeView === 'suppliers' && isActivated && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Supplier Invitations
                    </CardTitle>
                    <CardDescription>
                      Send secure invitations to suppliers
                    </CardDescription>
                  </div>
                  <InviteSupplierDialog onInviteSent={() => {}} />
                </div>
              </CardHeader>
              <CardContent>
                <InvitationsTable />
              </CardContent>
            </Card>
          )}

          {/* Operations View */}
          {activeView === 'operations' && isActivated && (
            <div className="space-y-6">
              {/* Actions Bar */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-500" />
                    Operations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleMatchInvoices} disabled={matching} className="bg-green-600 hover:bg-green-700">
                      {matching && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      Auto-Match
                    </Button>
                  </div>
                  {matchResult && (
                    <Alert className={matchResult.includes('Success') ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}>
                      <AlertDescription>{matchResult}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Vendors */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    Consented Vendors
                  </CardTitle>
                  <CardDescription>Authorized vendor numbers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Total consented vendors: <span className="font-bold">{data.dashboard.vendor_count ?? 0}</span></p>
                  </div>
                </CardContent>
              </Card>

              {/* Upload */}
              <APUpload consentedVendors={[]} buyerId={data.user.id} />

              {/* Payments */}
              <BuyerPaymentsTable buyerId={data.user.id} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}