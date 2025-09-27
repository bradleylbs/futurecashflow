"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Building, FileText, CreditCard, CheckCircle, Clock, AlertTriangle, 
  Mail, User, RefreshCw, LogOut, Menu, X, ChevronRight, 
  Home, Activity, Settings, Bell, AlertCircle, BarChart
} from "lucide-react"
import { KYCApplicationForm } from "@/components/kyc-application-form"
import { AgreementList } from "@/components/agreement-list"
import { AgreementSigning } from "@/components/agreement-signing"
import SupplierOnboardingWizard from "@/components/SupplierOnboardingWizard"

// Types
interface DashboardData {
  user: { id: string; email: string; role: string }
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

interface NavSection {
  id: string
  title: string
  icon: React.ElementType
  visible: (data: DashboardData | null) => boolean
  items: NavItem[]
}

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  description: string
  visible: (data: DashboardData | null) => boolean
  href?: string
}

// Navigation Configuration
const NAV_SECTIONS: NavSection[] = [
  {
    id: "dashboard",
    title: "Overview",
    icon: Home,
    visible: () => true,
    items: []
  },
  {
    id: "onboarding",
    title: "Onboarding",
    icon: Building,
    visible: (data) => {
      if (!data) return false
      const level = data.dashboard.access_level
      return level !== 'banking_verified'
    },
    items: [
      {
        id: "kyc",
        label: "KYC Application",
        icon: FileText,
        description: "Complete your verification",
        visible: (data) => data?.dashboard.access_level === 'pre_kyc'
      },
      {
        id: "banking",
        label: "Banking Setup",
        icon: CreditCard,
        description: "Add banking details",
        visible: (data) => data?.dashboard.access_level === 'kyc_approved'
      },
      {
        id: "agreements",
        label: "Sign Agreements",
        icon: FileText,
        description: "Review and sign terms",
        visible: (data) => {
          if (!data) return false
          const level = data.dashboard.access_level
          const signed = data.dashboard.agreement_status?.toLowerCase() === 'signed'
          return !signed && ['banking_submitted', 'banking_verified'].includes(level)
        }
      }
    ]
  },
  {
    id: "operations",
    title: "Operations",
    icon: Activity,
    visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
    items: [
      {
        id: "invoices",
        label: "Invoices",
        icon: FileText,
        description: "Manage your invoices",
        visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
        href: "/dashboard/invoices"
      },
      {
        id: "payments",
        label: "Payments",
        icon: CreditCard,
        description: "View payment history",
        visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
        href: "/supplier/payments"
      },
      {
        id: "early-payments",
        label: "Early Payment Offers",
        icon: Clock,
        description: "Access early payment options",
        visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
        href: "/supplier/early-payment-offers"
      }
    ]
  },
  {
    id: "account",
    title: "Account",
    icon: User,
    visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
    items: [
      {
        id: "profile",
        label: "Profile Settings",
        icon: User,
        description: "Update your information",
        visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
        href: "/supplier/profile"
      },
      {
        id: "banking-update",
        label: "Banking Details",
        icon: CreditCard,
        description: "Update bank information",
        visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
        href: "/supplier/banking"
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: BarChart,
        description: "View your metrics",
        visible: (data) => data?.dashboard.agreement_status?.toLowerCase() === 'signed',
        href: "/supplier/analytics"
      }
    ]
  }
]

// Utility Functions
function getAccessLevelInfo(level: string) {
  const levels = {
    pre_kyc: { title: "Getting Started", description: "Complete your KYC application", step: 1, total: 5 },
    kyc_approved: { title: "KYC Approved", description: "Submit banking details", step: 2, total: 5 },
    banking_submitted: { title: "Banking Submitted", description: "Sign agreement", step: 3, total: 5 },
    agreement_signed: { title: "Agreement Signed", description: "Banking verification pending", step: 4, total: 5 },
    banking_verified: { title: "Fully Verified", description: "All features unlocked", step: 5, total: 5 },
  }
  return levels[level as keyof typeof levels] || levels.pre_kyc
}

function getStatusColor(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'rejected') return 'bg-red-500/10 text-red-500 border-red-500/20'
  if (s === 'approved' || s === 'signed' || s === 'verified') return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  if (s === 'pending' || s === 'under_review') return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  return 'bg-muted text-muted-foreground border-border'
}

// Sub-components
const LoadingSkeleton = () => (
  <div className="relative min-h-screen flex items-center justify-center bg-black text-white">
    <div className="text-center space-y-6">
      <div className="p-6 rounded-full border border-white/10 bg-white/5">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
      <div className="flex items-baseline space-x-3">
        <h1 className="text-3xl font-bold">Future Finance</h1>
        <div className="w-px h-6 bg-blue-500/70" />
        <span className="text-2xl font-light text-muted-foreground">Cashflow</span>
      </div>
      <p className="text-sm text-muted-foreground">Loading supplier dashboard…</p>
    </div>
  </div>
)

const InvitationBanner: React.FC<{ invitation: DashboardData['invitation'] }> = ({ invitation }) => {
  if (!invitation) return null
  
  return (
    <Card className="bg-blue-500/10 border-blue-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Invitation Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Invited by:</p>
            <p className="text-muted-foreground">{invitation.buyer_company_name || invitation.buyer_email}</p>
          </div>
          <div>
            <p className="font-medium">Invitation Date:</p>
            <p className="text-muted-foreground">{new Date(invitation.sent_at).toLocaleDateString()}</p>
          </div>
          {invitation.invitation_message && (
            <div className="md:col-span-2">
              <p className="font-medium">Message:</p>
              <p className="text-muted-foreground italic">"{invitation.invitation_message}"</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const OnboardingProgress: React.FC<{ data: DashboardData }> = ({ data }) => {
  const levelInfo = getAccessLevelInfo(data.dashboard.access_level)
  const progressPercentage = (levelInfo.step / levelInfo.total) * 100

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Onboarding Progress
        </CardTitle>
        <CardDescription>{levelInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{levelInfo.title}</span>
          <span className="text-sm text-muted-foreground">Step {levelInfo.step} of {levelInfo.total}</span>
        </div>
        <Progress 
          value={progressPercentage} 
          className="h-2"
          aria-label={`Onboarding progress: ${levelInfo.step} of ${levelInfo.total} steps completed`}
          aria-valuenow={levelInfo.step}
          aria-valuemin={1}
          aria-valuemax={levelInfo.total}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {data.dashboard.kyc_status === "approved" ? (
                <CheckCircle className="h-4 w-4 text-blue-500" aria-hidden="true" />
              ) : (
                <Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />
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
                <CreditCard className="h-4 w-4 text-blue-500" aria-hidden="true" />
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
                <FileText className="h-4 w-4 text-blue-500" aria-hidden="true" />
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
  )
}

const SystemStatus: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
    <Activity className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-green-500`} aria-hidden="true" />
    <span className="text-muted-foreground">System OK</span>
    <span className="sr-only">All systems operational</span>
  </div>
)

// Main Component
export default function SupplierDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeView, setActiveView] = useState("dashboard")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string>("onboarding")
  const [selectedAgreement, setSelectedAgreement] = useState<any | null>(null)
  const lastRefresh = useRef<Date>(new Date())
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/status", { credentials: "include", cache: "no-store" })
      if (response.status === 401) {
        window.location.href = "/auth/login"
        return
      }
      if (!response.ok) throw new Error("Failed to fetch dashboard data")
      const dashboardData = await response.json()
      setData(dashboardData)
      setError("")
      lastRefresh.current = new Date()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  const startAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current)
    autoRefreshInterval.current = setInterval(fetchDashboardData, 60000)
  }, [fetchDashboardData])

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current)
      autoRefreshInterval.current = null
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh()
      } else {
        fetchDashboardData()
        startAutoRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    startAutoRefresh()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopAutoRefresh()
    }
  }, [fetchDashboardData, startAutoRefresh, stopAutoRefresh])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError("")
    await fetchDashboardData()
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch (err) {
      console.error("Logout error:", err)
    }
    window.location.href = "/auth/login"
  }

  const handleNavClick = (viewId: string, sectionId?: string) => {
    const navItem = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === viewId)
    if (navItem?.href) {
      window.location.href = navItem.href
      return
    }
    setActiveView(viewId)
    if (sectionId) setExpandedSection(sectionId)
    setSidebarOpen(false)
  }

  const visibleSections = NAV_SECTIONS.filter(section => section.visible(data))
  const currentSection = visibleSections.find(s => 
    s.id === activeView || s.items.some(i => i.id === activeView)
  )
  const currentItem = currentSection?.items.find(i => i.id === activeView)

  if (loading) return <LoadingSkeleton />

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Backdrop */}
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
          border-r border-white/10 z-50 transform transition-transform duration-300 flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30">
                <Building className="h-6 w-6 text-blue-500" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Supplier Portal</h1>
                <p className="text-xs text-muted-foreground">{data?.dashboard.company_name || 'Dashboard'}</p>
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

        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Supplier sections">
          {visibleSections.map((section) => {
            const SectionIcon = section.icon
            const isExpanded = expandedSection === section.id
            const isActive = activeView === section.id || section.items.some(i => i.id === activeView)
            const visibleItems = section.items.filter(item => item.visible(data))

            if (visibleItems.length === 0) {
              return (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                    ${activeView === section.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                    }
                  `}
                  aria-current={activeView === section.id ? 'page' : undefined}
                >
                  <SectionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="font-medium">{section.title}</span>
                </button>
              )
            }

            return (
              <div key={section.id}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? "" : section.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200
                    ${isActive ? 'text-white bg-white/5' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}
                  `}
                  aria-expanded={isExpanded}
                  aria-controls={`section-${section.id}`}
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="font-medium">{section.title}</span>
                  </div>
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {isExpanded && (
                  <div id={`section-${section.id}`} className="mt-1 ml-4 space-y-1">
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon
                      const isItemActive = activeView === item.id

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id, section.id)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                            ${isItemActive 
                              ? 'bg-blue-600 text-white' 
                              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                            }
                          `}
                          aria-current={isItemActive ? 'page' : undefined}
                        >
                          <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-xs opacity-70">{item.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <SystemStatus />
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/10">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
                <span className="text-muted-foreground">Dashboard</span>
                {currentSection && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">{currentSection.title}</span>
                  </>
                )}
                {currentItem && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-white font-medium">{currentItem.label}</span>
                  </>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRefresh} 
                disabled={refreshing}
                size="sm"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                aria-label="Refresh dashboard data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>

              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notifications">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </Button>

              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Settings">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {data && (
            <>
              {activeView === 'dashboard' && (
                <>
                  <InvitationBanner invitation={data.invitation} />
                  <OnboardingProgress data={data} />
                  <SupplierOnboardingWizard />
                </>
              )}

              {activeView === 'kyc' && (
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardHeader>
                    <CardTitle>Complete Your KYC Application</CardTitle>
                    <CardDescription>Submit your company information and required documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KYCApplicationForm />
                  </CardContent>
                </Card>
              )}

              {activeView === 'banking' && (
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardHeader>
                    <CardTitle>Submit Banking Details</CardTitle>
                    <CardDescription>Provide your banking information for verification</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4 border-blue-500/50 bg-blue-500/10">
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
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

              {activeView === 'agreements' && (
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardHeader>
                    <CardTitle>Your Agreements</CardTitle>
                    <CardDescription>Review and manage your signed agreements</CardDescription>
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
                      <AgreementList onSelectAgreement={setSelectedAgreement} />
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}