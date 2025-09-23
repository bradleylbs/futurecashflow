"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
// import { LogoIcon } from "@/components/brand-logo"
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  RefreshCw,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Link2,
  FileCheck2,
} from "lucide-react"
import { AdminApplicationsTable } from "@/components/admin-applications-table"
import { AdminDocumentsTable } from "@/components/admin-documents-table"
import { AdminBankingTable } from "@/components/admin-banking-table"
import AdminPaymentQueue from "@/components/admin-payment-queue"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart as ReBarChart, Bar, XAxis, YAxis, PieChart as RePieChart, Pie, Cell } from "recharts"

interface AdminStats {
  total_applications: number
  pending: number
  under_review: number
  ready_for_decision: number
  approved: number
  rejected: number
  suppliers: number
  buyers: number
}

interface Analytics {
  documents: { total: number; verified: number; rejected: number; pending: number }
  invitations: { sent: number; opened: number; registered: number; completed: number; expired: number }
  pipeline: { pending: number; under_review: number; approved: number; rejected: number }
  agreements: { presented: number; signed: number }
  relationships: { relationships: number }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      const [appsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/applications?limit=1", { credentials: "include" }),
        fetch("/api/admin/analytics", { credentials: "include" }),
      ])

      if (!appsRes.ok) {
        const msg = await appsRes.text().catch(() => "")
        throw new Error(`Failed to fetch admin statistics (${appsRes.status}) ${msg}`)
      }

      const data = await appsRes.json()
      setStats(data.stats)

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }
      setError("")
    } catch (error) {
      setError("Failed to load dashboard statistics")
      console.error("Fetch admin stats error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [refreshTrigger])

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await fetchStats()
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {}
    router.push("/auth/login")
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-black text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
        </div>
        <div className="text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 rounded-full border border-border bg-muted">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <div className="flex items-baseline space-x-3">
              <h1 className="text-3xl font-bold">Future</h1>
              <div className="w-px h-6 bg-primary/70" />
              <span className="text-2xl font-light text-muted-foreground whitespace-nowrap">Finance Cashflow </span>
            </div>
            <div className="flex space-x-2 mt-4">
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-primary/80 rounded-full animate-bounce delay-200"></div>
            </div>
            <p className="text-sm text-muted-foreground">Loading admin dashboard…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      </div>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div>
              <h1 className="text-4xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground text-lg">Manage KYC applications and document reviews</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4"
            >
              <RefreshCw className={`mr-2 h-4 w-4 text-blue-100 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button
              onClick={handleLogout}
              className="h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4"
            >
              Logout
            </Button>
          </div>
        </div>

      {error && (
        <div className="bg-card rounded-2xl border border-red-200/30">
          <Alert variant="destructive" className="border-0 bg-transparent">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Application Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_applications}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.suppliers} suppliers, {stats.buyers} buyers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pending + stats.under_review}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pending} pending, {stats.under_review} in review
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Decision</CardTitle>
              <AlertTriangle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.ready_for_decision}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting final approval/rejection</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.approved + stats.rejected}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-blue-400 font-semibold">{stats.approved} approved</span>,{" "}
                <span className="text-red-400 font-semibold">{stats.rejected} rejected</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileCheck2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{analytics.documents.total}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.documents.verified} verified, {analytics.documents.pending} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invitations Sent</CardTitle>
              <PieChartIcon className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{analytics.invitations.sent}</div>
              <p className="text-xs text-muted-foreground">{analytics.invitations.completed} completed</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agreements</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{analytics.agreements.signed}</div>
              <p className="text-xs text-muted-foreground">{analytics.agreements.presented} presented</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Relationships</CardTitle>
              <Link2 className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-400">{analytics.relationships.relationships}</div>
              <p className="text-xs text-muted-foreground">buyer-supplier pairs</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
              <BarChartIcon className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-400">
                {analytics.pipeline.pending + analytics.pipeline.under_review + analytics.pipeline.approved + analytics.pipeline.rejected}
              </div>
              <p className="text-xs text-muted-foreground">total across stages</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics and Management Tabs */}
  <Tabs defaultValue="applications" className="space-y-6">
  <TabsList className="bg-muted p-1 rounded-2xl">
          <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
            <Clock className="h-4 w-4" />
            Payments
          </TabsTrigger>
        <TabsContent value="payments" className="space-y-4">
          <Card className="bg-card border border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-xl font-bold">Payment Queue</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">Review, approve, and execute supplier payments</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AdminPaymentQueue />
            </CardContent>
          </Card>
        </TabsContent>
          <TabsTrigger value="applications" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
            <Building className="h-4 w-4" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
            <FileText className="h-4 w-4" />
            Document Review
          </TabsTrigger>
          <TabsTrigger value="banking" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
            <CheckCircle className="h-4 w-4" />
            Banking
          </TabsTrigger>
          {analytics && (
            <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl">
              <BarChartIcon className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card className="bg-card border border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Building className="h-5 w-5 text-blue-600" />
                <span className="text-xl font-bold">KYC Applications</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">Review and manage all KYC applications from suppliers and buyers</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AdminApplicationsTable refreshTrigger={refreshTrigger} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card className="bg-card border border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-xl font-bold">Document Review Queue</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">Review individual documents and update their verification status</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AdminDocumentsTable refreshTrigger={refreshTrigger} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <Card className="bg-card border border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-xl font-bold">Banking Verification</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">Verify supplier banking details to unlock premium features</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AdminBankingTable />
            </CardContent>
          </Card>
        </TabsContent>

        {analytics && (
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pipeline Bar Chart */}
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle>Application Pipeline</CardTitle>
                  <CardDescription>Stage distribution of KYC applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      pending: { label: "Pending", color: "hsl(45, 93%, 47%)" },
                      under_review: { label: "In Review", color: "hsl(28, 97%, 53%)" },
                      approved: { label: "Approved", color: "hsl(142, 72%, 45%)" },
                      rejected: { label: "Rejected", color: "hsl(0, 84%, 60%)" },
                    }}
                    className="w-full"
                  >
                    <ReBarChart data={[{ name: "Pipeline", ...analytics.pipeline }]}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <XAxis dataKey="name" hide />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Bar dataKey="pending" fill="var(--color-pending)" />
                      <Bar dataKey="under_review" fill="var(--color-under_review)" />
                      <Bar dataKey="approved" fill="var(--color-approved)" />
                      <Bar dataKey="rejected" fill="var(--color-rejected)" />
                      <ChartLegend content={<ChartLegendContent />} />
                    </ReBarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Invitations Pie Chart */}
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle>Invitation Funnel</CardTitle>
                  <CardDescription>Opened → Registered → Completed vs Expired</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      opened: { label: "Opened", color: "hsl(199, 89%, 48%)" },
                      registered: { label: "Registered", color: "hsl(262, 83%, 58%)" },
                      completed: { label: "Completed", color: "hsl(142, 72%, 45%)" },
                      expired: { label: "Expired", color: "hsl(0, 84%, 60%)" },
                    }}
                    className="w-full"
                  >
                    <RePieChart>
                      <Pie
                        data={[
                          { name: "opened", value: analytics.invitations.opened },
                          { name: "registered", value: analytics.invitations.registered },
                          { name: "completed", value: analytics.invitations.completed },
                          { name: "expired", value: analytics.invitations.expired },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        label
                      >
                        <Cell name="opened" fill="var(--color-opened)" />
                        <Cell name="registered" fill="var(--color-registered)" />
                        <Cell name="completed" fill="var(--color-completed)" />
                        <Cell name="expired" fill="var(--color-expired)" />
                      </Pie>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </RePieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  )
}
