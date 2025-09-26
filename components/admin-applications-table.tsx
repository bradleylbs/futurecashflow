"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  MoreHorizontal,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building,
  Users,
  FileText,
  Search,
  Filter,
  ChevronRight,
  Info,
  Shield,
  TrendingUp,
  TrendingDown,
  Download,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Hash,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  Zap,
  Package,
  UserCheck,
  AlertCircle,
  BarChart3,
} from "lucide-react"
import { AdminDecisionDialog } from "@/components/admin-decision-dialog"

// Enhanced interfaces with better typing
interface Application {
  kyc_id: string
  kyc_status: string
  submitted_at: string
  user_id: string
  email: string
  user_role: string
  company_name: string
  registration_number?: string
  tax_number?: string
  company_email?: string
  company_phone?: string
  company_address?: string
  company_type: string
  invited_company_name?: string
  document_count: number
  verified_documents: number
  rejected_documents: number
  pending_documents: number
}

interface AdminApplicationsTableProps {
  refreshTrigger?: number
}

// Application Stats Card Component
const ApplicationStatsCard: React.FC<{
  title: string
  value: number | string
  icon: React.ElementType
  color?: string
  trend?: { value: number; isPositive: boolean }
  subtitle?: string
  loading?: boolean
}> = ({ title, value, icon: Icon, color = "blue", trend, subtitle, loading }) => {
  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const colorStyles: Record<string, string> = {
    blue: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    green: "from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30",
    amber: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    purple: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    red: "from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30",
  }

  return (
    <div className={`
      relative overflow-hidden p-4 rounded-xl bg-gradient-to-br ${(colorStyles as Record<string, string>)[color] || colorStyles.blue} 
      backdrop-blur-sm border hover:scale-[1.02] transition-all duration-300 cursor-pointer group
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform">
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

export function AdminApplicationsTable({ refreshTrigger }: AdminApplicationsTableProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [userTypeFilter, setUserTypeFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showDecisionDialog, setShowDecisionDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [detailsDocs, setDetailsDocs] = useState<Array<{
    document_id: string
    document_type: string
    filename: string
    file_size: number
    document_status: string
    upload_date: string
  }>>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Fetch applications from API
  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (userTypeFilter !== "all") params.append("userType", userTypeFilter)

      const response = await fetch(`/api/admin/applications?${params.toString()}`, { credentials: "include" })

      if (!response.ok) {
        const msg = await response.text().catch(() => "")
        throw new Error(`Failed to fetch applications (${response.status}) ${msg}`)
      }

      const data = await response.json()
      setApplications(data.applications || [])
      setError("")
    } catch (error) {
      setError("Failed to load applications. Please try again.")
      console.error("Fetch applications error:", error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, userTypeFilter])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications, refreshTrigger])

  // Calculate statistics
  const statistics = useMemo(() => {
    const stats = {
      total: applications.length,
      pending: applications.filter(a => a.kyc_status === 'pending').length,
      under_review: applications.filter(a => a.kyc_status === 'under_review').length,
      ready_for_decision: applications.filter(a => a.kyc_status === 'ready_for_decision').length,
      approved: applications.filter(a => a.kyc_status === 'approved').length,
      rejected: applications.filter(a => a.kyc_status === 'rejected').length,
      suppliers: applications.filter(a => a.user_role === 'supplier').length,
      buyers: applications.filter(a => a.user_role === 'buyer').length,
      
      // Calculate completion rate
      completion_rate: applications.length > 0 
        ? Math.round((applications.filter(a => a.kyc_status === 'approved' || a.kyc_status === 'rejected').length / applications.length) * 100)
        : 0,
        
      // Average document verification rate
      avg_doc_verification: applications.length > 0
        ? Math.round(applications.reduce((sum, app) => {
            if (app.document_count === 0) return sum
            return sum + ((app.verified_documents / app.document_count) * 100)
          }, 0) / applications.length)
        : 0
    }
    
    return stats
  }, [applications])

  // Enhanced status badge with better visual hierarchy
  const getStatusBadge = (status: string, size: "default" | "small" = "default") => {
    const statusConfig = {
      pending: {
        icon: Clock,
        label: "Pending",
        bgClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        description: "Application submitted, awaiting review"
      },
      under_review: {
        icon: Eye,
        label: "Under Review",
        bgClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        description: "Currently being reviewed by admin"
      },
      ready_for_decision: {
        icon: AlertTriangle,
        label: "Ready for Decision",
        bgClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        description: "Review complete, awaiting final decision"
      },
      approved: {
        icon: CheckCircle,
        label: "Approved",
        bgClass: "bg-green-500/20 text-green-400 border-green-500/30",
        description: "Application approved"
      },
      rejected: {
        icon: XCircle,
        label: "Rejected",
        bgClass: "bg-red-500/20 text-red-400 border-red-500/30",
        description: "Application rejected"
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon
    const iconSize = size === "small" ? "h-3 w-3" : "h-4 w-4"
    const textSize = size === "small" ? "text-xs" : "text-sm"

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${config.bgClass} font-medium ${textSize}`}>
              <Icon className={iconSize} />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // User type badge
  const getUserTypeBadge = (role: string) => {
    const isSupplier = role === "supplier"
    const Icon = isSupplier ? Building : Users
    const bgClass = isSupplier 
      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
      : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${bgClass} font-medium`}>
              <Icon className="h-3 w-3" />
              {isSupplier ? "Supplier" : "Buyer"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{isSupplier ? "Supplier application" : "Buyer application"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Format date with relative time
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not submitted"
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    })
  }

  // Document progress component
  const getDocumentProgress = (app: Application) => {
    const total = app.document_count
    
    if (total === 0) {
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No documents</span>
        </div>
      )
    }

    const verifiedPercent = Math.round((app.verified_documents / total) * 100)
    const rejectedPercent = Math.round((app.rejected_documents / total) * 100)
    const pendingPercent = Math.round((app.pending_documents / total) * 100)
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {app.verified_documents + app.rejected_documents}/{total} reviewed
          </span>
          <span className="font-medium">{verifiedPercent}%</span>
        </div>
        
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="h-full flex">
            {app.verified_documents > 0 && (
              <div 
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${verifiedPercent}%` }}
              />
            )}
            {app.rejected_documents > 0 && (
              <div 
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${rejectedPercent}%` }}
              />
            )}
            {app.pending_documents > 0 && (
              <div 
                className="bg-amber-500 transition-all duration-500"
                style={{ width: `${pendingPercent}%` }}
              />
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          {app.verified_documents > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{app.verified_documents} verified</span>
            </div>
          )}
          {app.rejected_documents > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>{app.rejected_documents} rejected</span>
            </div>
          )}
          {app.pending_documents > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{app.pending_documents} pending</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Handle making a decision
  const handleMakeDecision = (application: Application) => {
    setSelectedApplication(application)
    setShowDecisionDialog(true)
  }

  // Fetch documents for an application
  const fetchDetailsDocs = async (kycId: string) => {
    try {
      const res = await fetch(`/api/admin/documents?kycId=${encodeURIComponent(kycId)}&limit=100`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setDetailsDocs(Array.isArray(data.documents) ? data.documents : [])
      } else {
        setDetailsDocs([])
      }
    } catch {
      setDetailsDocs([])
    }
  }

  // Fetch single application details
  const fetchSingleApplication = async (kycId: string) => {
    try {
      const res = await fetch(`/api/admin/applications?kycId=${encodeURIComponent(kycId)}&limit=1`, { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      const fresh = Array.isArray(data.applications) ? data.applications[0] : null
      if (fresh && selectedApplication && fresh.kyc_id === selectedApplication.kyc_id) {
        setSelectedApplication({ ...selectedApplication, ...fresh })
      }
    } catch {}
  }

  // Handle viewing details
  const handleViewDetails = async (application: Application) => {
    setSelectedApplication(application)
    setShowDetailsDialog(true)
    setDetailsLoading(true)
    await Promise.all([
      fetchDetailsDocs(application.kyc_id),
      fetchSingleApplication(application.kyc_id),
    ])
    setDetailsLoading(false)
  }

  // Handle decision completion
  const handleDecisionComplete = () => {
    setShowDecisionDialog(false)
    setSelectedApplication(null)
    fetchApplications()
    setSuccessMessage("Decision recorded successfully")
    setTimeout(() => setSuccessMessage(""), 5000)
  }

  // Handle sort
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let filtered = applications.filter((app) => {
      const matchesSearch =
        searchTerm === "" ||
        app.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.invited_company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.tax_number?.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSearch
    })

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key]
        const bValue = (b as any)[sortConfig.key]
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [applications, searchTerm, sortConfig])

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedApplications.length === filteredAndSortedApplications.length) {
      setSelectedApplications([])
    } else {
      setSelectedApplications(filteredAndSortedApplications.map(app => app.kyc_id))
    }
  }

  const toggleSelection = (kycId: string) => {
    setSelectedApplications(prev =>
      prev.includes(kycId) 
        ? prev.filter(id => id !== kycId)
        : [...prev, kycId]
    )
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <ApplicationStatsCard
            title="Total"
            value={statistics.total}
            icon={Package}
            color="blue"
            loading={isLoading}
          />
          <ApplicationStatsCard
            title="Pending"
            value={statistics.pending}
            icon={Clock}
            color="amber"
            trend={{ value: 5, isPositive: false }}
            loading={isLoading}
          />
          <ApplicationStatsCard
            title="In Review"
            value={statistics.under_review}
            icon={Eye}
            color="blue"
            loading={isLoading}
          />
          <ApplicationStatsCard
            title="Decisions"
            value={statistics.ready_for_decision}
            icon={AlertTriangle}
            color="purple"
            loading={isLoading}
          />
          <ApplicationStatsCard
            title="Approved"
            value={statistics.approved}
            icon={CheckCircle}
            color="green"
            trend={{ value: 12, isPositive: true }}
            loading={isLoading}
          />
          <ApplicationStatsCard
            title="Rejected"
            value={statistics.rejected}
            icon={XCircle}
            color="red"
            loading={isLoading}
          />
          <ApplicationStatsCard
            title="Suppliers"
            value={statistics.suppliers}
            icon={Building}
            color="purple"
            loading={isLoading}
          />
          <ApplicationStatsCard
            title="Buyers"
            value={statistics.buyers}
            icon={Users}
            color="blue"
            loading={isLoading}
          />
        </div>

        {/* Completion Progress */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                  <Activity className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Processing Progress</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {statistics.completion_rate}% of applications processed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">{statistics.completion_rate}%</p>
                <p className="text-xs text-muted-foreground">Avg doc verification: {statistics.avg_doc_verification}%</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={statistics.completion_rate} className="h-3" />
          </CardContent>
        </Card>

        {/* Enhanced Filters and Controls */}
        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies, emails, registration numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="ready_for_decision">Ready for Decision</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* User Type Filter */}
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <UserCheck className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
                <SelectItem value="buyer">Buyers</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Actions */}
            {selectedApplications.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                  {selectedApplications.length} selected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/10"
                  onClick={() => setSelectedApplications([])}
                >
                  Clear Selection
                </Button>
              </div>
            )}

            {/* Refresh Button */}
            <Button 
              onClick={fetchApplications} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{filteredAndSortedApplications.length} applications</span>
              {searchTerm && (
                <Badge variant="secondary" className="bg-white/10">
                  Searching: "{searchTerm}"
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs hover:bg-white/10"
                onClick={() => {/* Export functionality */}}
              >
                <Download className="h-3 w-3 mr-1" />
                Export Data
              </Button>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        {filteredAndSortedApplications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10">
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedApplications.length === filteredAndSortedApplications.length}
                        onChange={handleSelectAll}
                        className="rounded border-white/30 bg-white/10"
                      />
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('company_name')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Company {sortConfig?.key === 'company_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead 
                      onClick={() => handleSort('kyc_status')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Status {sortConfig?.key === 'kyc_status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead 
                      onClick={() => handleSort('submitted_at')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Submitted {sortConfig?.key === 'submitted_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedApplications.map((application) => {
                    const isSelected = selectedApplications.includes(application.kyc_id)
                    const canMakeDecision = application.kyc_status === "ready_for_decision"
                    
                    return (
                      <TableRow 
                        key={application.kyc_id}
                        className={`
                          border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer
                          ${isSelected ? 'bg-white/10' : ''}
                        `}
                        onClick={() => handleViewDetails(application)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(application.kyc_id)}
                            className="rounded border-white/30 bg-white/10"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {application.company_name || application.invited_company_name || "Unknown Company"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{application.email}</span>
                            </div>
                            {application.registration_number && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                <span>Reg: {application.registration_number}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getUserTypeBadge(application.user_role)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(application.kyc_status)}
                            {canMakeDecision && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Action Required
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {getDocumentProgress(application)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {formatDate(application.submitted_at)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{new Date(application.submitted_at).toLocaleString()}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            {canMakeDecision && (
                              <Button
                                size="sm"
                                onClick={() => handleMakeDecision(application)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Decide
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10" title="More actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                                <DropdownMenuLabel>Application Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem 
                                  onClick={() => handleViewDetails(application)}
                                  className="hover:bg-white/10"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {canMakeDecision && (
                                  <DropdownMenuItem 
                                    onClick={() => handleMakeDecision(application)}
                                    className="hover:bg-white/10"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Make Decision
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="hover:bg-white/10">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Documents
                                </DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-white/10">
                                  <Download className="mr-2 h-4 w-4" />
                                  Export Application
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Decision Dialog */}
        {selectedApplication && (
          <AdminDecisionDialog
            open={showDecisionDialog}
            onOpenChange={setShowDecisionDialog}
            application={selectedApplication}
            onDecisionComplete={handleDecisionComplete}
          />
        )}

        {/* Enhanced Details Dialog */}
        {selectedApplication && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 max-h-[90vh] overflow-y-auto sm:max-w-[1000px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Application Details
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Complete KYC application information
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="bg-white/5 border-white/10">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="company">Company Details</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="history">Activity History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6 mt-6">
                  {/* Status and Quick Actions */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Application Status</p>
                      {getStatusBadge(selectedApplication.kyc_status, "default")}
                    </div>
                    {selectedApplication.kyc_status === "ready_for_decision" && (
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false)
                          handleMakeDecision(selectedApplication)
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Make Decision
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Information */}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Building className="h-5 w-5 text-blue-400" />
                          Company Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <InfoRow 
                          label="Company Name" 
                          value={selectedApplication.company_name || selectedApplication.invited_company_name || "N/A"} 
                        />
                        <InfoRow 
                          label="Registration Number" 
                          value={selectedApplication.registration_number || "N/A"} 
                        />
                        <InfoRow 
                          label="Tax Number" 
                          value={selectedApplication.tax_number || "N/A"} 
                        />
                        <InfoRow 
                          label="Company Type" 
                          value={selectedApplication.company_type || "N/A"} 
                        />
                      </CardContent>
                    </Card>
                    
                    {/* Applicant Information */}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <User className="h-5 w-5 text-purple-400" />
                          Applicant Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <InfoRow 
                          label="Email" 
                          value={selectedApplication.email} 
                          icon={Mail}
                        />
                        <InfoRow 
                          label="User Role" 
                          value={selectedApplication.user_role} 
                        />
                        <InfoRow 
                          label="Submitted" 
                          value={new Date(selectedApplication.submitted_at).toLocaleString()} 
                          icon={Calendar}
                        />
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Document Progress */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-green-400" />
                        Document Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getDocumentProgress(selectedApplication)}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="company" className="space-y-6 mt-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle>Complete Company Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoRow label="Company Email" value={selectedApplication.company_email || "N/A"} icon={Mail} />
                        <InfoRow label="Company Phone" value={selectedApplication.company_phone || "N/A"} icon={Phone} />
                      </div>
                      <InfoRow 
                        label="Business Address" 
                        value={selectedApplication.company_address || "N/A"} 
                        icon={MapPin}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="documents" className="mt-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Submitted Documents</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (selectedApplication) {
                              setDetailsLoading(true)
                              await fetchDetailsDocs(selectedApplication.kyc_id)
                              setDetailsLoading(false)
                            }
                          }}
                          disabled={detailsLoading}
                          className="border-white/10 hover:bg-white/10"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${detailsLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {detailsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
                        </div>
                      ) : detailsDocs.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No documents found</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detailsDocs.map((doc) => (
                            <div 
                              key={doc.document_id}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{doc.filename}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.document_type} • {formatFileSize(doc.file_size)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(doc.document_status, "small")}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-white/10"
                                  onClick={() => window.open(`/api/admin/documents/${doc.document_id}/preview`, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="history" className="mt-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle>Activity History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                          <div className="flex-1">
                            <p className="font-medium">Application Submitted</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedApplication.submitted_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {/* Add more history items as needed */}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}

// Info Row Component
const InfoRow: React.FC<{
  label: string
  value: string
  icon?: React.ElementType
}> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3" />}
      {label}:
    </span>
    <span className="font-medium text-right">{value}</span>
  </div>
)

// Format file size helper
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
    
    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
    
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-white/5 last:border-0">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      ))}
    </div>
  </div>
)

// Empty State Component
const EmptyState = () => (
  <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
    <h3 className="text-xl font-semibold mb-2">No applications found</h3>
    <p className="text-muted-foreground max-w-md mx-auto">
      No applications match your current filters. Try adjusting your search criteria or clearing filters.
    </p>
    <Button variant="outline" className="mt-6 border-white/20 hover:bg-white/10">
      <RefreshCw className="h-4 w-4 mr-2" />
      Clear Filters
    </Button>
  </div>
)