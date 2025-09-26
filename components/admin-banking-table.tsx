"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  CheckCircle2,
  CircleSlash2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Eye,
  Shield,
  Building2,
  Search,
  Filter,
  Download,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Hash,
  Mail,
  Phone,
  MapPin,
  Info,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Unlock,
  DollarSign,
  Banknote,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  MoreHorizontal,
  ChevronRight,
  Activity,
  Zap,
} from "lucide-react"

// Enhanced interfaces
interface BankingRow {
  banking_id: string
  user_id: string
  email: string
  company_name?: string
  bank_name: string
  account_holder_name: string
  account_number_masked?: string
  routing_number_masked?: string
  status: string
  submission_date: string
  verification_date?: string
  verification_notes?: string
  [key: string]: string | undefined
}

interface BankingDetails extends BankingRow {
  account_number_full?: string
  routing_number_full?: string
  swift_code?: string
  iban?: string
  bank_address?: string
  additional_info?: string
}

// Banking Stats Card Component
const BankingStatsCard: React.FC<{
  title: string
  value: number | string
  icon: React.ElementType
  color?: string
  subtitle?: string
  trend?: { value: number; isPositive: boolean }
  loading?: boolean
}> = ({ title, value, icon: Icon, color = "blue", subtitle, trend, loading }) => {
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
      relative overflow-hidden p-4 rounded-xl bg-gradient-to-br ${colorStyles[color]} 
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

export function AdminBankingTable() {
  const [rows, setRows] = useState<BankingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [searchTerm, setSearchTerm] = useState("")
  const [selected, setSelected] = useState<BankingRow | null>(null)
  const [details, setDetails] = useState<BankingDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState("")
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  // Fetch banking submissions
  const fetchRows = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      
      const res = await fetch(`/api/admin/banking?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch banking submissions")
      
      const data = await res.json()
      setRows(data.banking || [])
      setError("")
    } catch (e) {
      console.error(e)
      setError("Failed to load banking submissions. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  // Calculate statistics
  const statistics = useMemo(() => {
    const stats = {
      total: rows.length,
      pending: rows.filter(r => r.status === 'pending').length,
      verified: rows.filter(r => r.status === 'verified').length,
      rejected: rows.filter(r => r.status === 'rejected').length,
      resubmission: rows.filter(r => r.status === 'resubmission_required').length,
      
      verificationRate: rows.length > 0 
        ? Math.round((rows.filter(r => r.status === 'verified').length / rows.length) * 100)
        : 0,
        
      rejectionRate: rows.length > 0
        ? Math.round((rows.filter(r => r.status === 'rejected').length / rows.length) * 100)
        : 0
    }
    
    return stats
  }, [rows])

  // Handle banking action
  const handleAction = async (banking_id: string, decision: "verify" | "reject" | "resubmission_required") => {
    try {
      setProcessingId(banking_id)
      
      const res = await fetch(`/api/admin/banking/${banking_id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: decisionNotes || undefined }),
      })
      
      if (res.ok) {
        setDecisionNotes("")
        setSelected(null)
        setDetails(null)
        setShowDetailsDialog(false)
        fetchRows()
        
        const actionText = decision === 'verify' ? 'verified' : 
                          decision === 'reject' ? 'rejected' : 
                          'marked for resubmission'
        setSuccessMessage(`Banking details ${actionText} successfully`)
        setTimeout(() => setSuccessMessage(""), 5000)
      } else {
        try {
          const data = await res.json()
          setError(data?.error || "Failed to update banking verification")
        } catch {
          setError("Failed to update banking verification")
        }
        setTimeout(() => setError(""), 5000)
      }
    } catch (error) {
      setError("Network error. Please check your connection.")
      setTimeout(() => setError(""), 5000)
    } finally {
      setProcessingId(null)
    }
  }

  // Bulk actions
  const handleBulkAction = async (decision: "verify" | "reject") => {
    if (selectedRows.length === 0) return
    
    setBulkProcessing(true)
    let processed = 0
    
    for (const bankingId of selectedRows) {
      await handleAction(bankingId, decision)
      processed++
    }
    
    setBulkProcessing(false)
    setSelectedRows([])
    setSuccessMessage(`Successfully processed ${processed} banking submissions`)
    setTimeout(() => setSuccessMessage(""), 5000)
  }

  // Enhanced status badge
  const getStatusBadge = (status: string, size: "default" | "small" = "default") => {
    const statusConfig = {
      pending: {
        icon: Clock,
        label: "Pending",
        bgClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        description: "Awaiting verification"
      },
      verified: {
        icon: ShieldCheck,
        label: "Verified",
        bgClass: "bg-green-500/20 text-green-400 border-green-500/30",
        description: "Banking details verified and approved"
      },
      rejected: {
        icon: ShieldX,
        label: "Rejected",
        bgClass: "bg-red-500/20 text-red-400 border-red-500/30",
        description: "Banking details rejected"
      },
      resubmission_required: {
        icon: ShieldAlert,
        label: "Resubmission Required",
        bgClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        description: "Additional information required"
      }
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

  // Handle viewing details
  const handleViewDetails = async (row: BankingRow) => {
    setSelected(row)
    setDetails(null)
    setShowDetailsDialog(true)
    setDetailsLoading(true)
    
    try {
      const res = await fetch(`/api/admin/banking/${row.banking_id}`)
      if (res.ok) {
        const data = await res.json()
        setDetails(data.banking)
      } else {
        setError("Failed to load banking details")
        setTimeout(() => setError(""), 5000)
      }
    } catch {
      setError("Failed to load banking details")
      setTimeout(() => setError(""), 5000)
    } finally {
      setDetailsLoading(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setSuccessMessage(`${label} copied to clipboard`)
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows.filter(row => {
      const matchesSearch = !searchTerm || 
        row.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.account_holder_name.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof BankingRow]
        const bValue = b[sortConfig.key as keyof BankingRow]
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [rows, searchTerm, sortConfig])

  // Handle sort
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Toggle selection
  const toggleSelection = (bankingId: string) => {
    setSelectedRows(prev =>
      prev.includes(bankingId) 
        ? prev.filter(id => id !== bankingId)
        : [...prev, bankingId]
    )
  }

  const handleSelectAll = () => {
    if (selectedRows.length === filteredAndSortedRows.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredAndSortedRows.map(row => row.banking_id))
    }
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <BankingStatsCard
            title="Total"
            value={statistics.total}
            icon={CreditCard}
            color="blue"
            loading={isLoading}
          />
          <BankingStatsCard
            title="Pending"
            value={statistics.pending}
            icon={Clock}
            color="amber"
            subtitle="Awaiting review"
            loading={isLoading}
          />
          <BankingStatsCard
            title="Verified"
            value={statistics.verified}
            icon={ShieldCheck}
            color="green"
            trend={{ value: 15, isPositive: true }}
            loading={isLoading}
          />
          <BankingStatsCard
            title="Rejected"
            value={statistics.rejected}
            icon={ShieldX}
            color="red"
            loading={isLoading}
          />
          <BankingStatsCard
            title="Resubmission"
            value={statistics.resubmission}
            icon={ShieldAlert}
            color="purple"
            subtitle="Needs update"
            loading={isLoading}
          />
          <BankingStatsCard
            title="Success Rate"
            value={`${statistics.verificationRate}%`}
            icon={TrendingUp}
            color="green"
            trend={{ value: 8, isPositive: true }}
            loading={isLoading}
          />
        </div>

        {/* Progress Overview */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Verification Progress</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Overall banking verification status
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-400">{statistics.verificationRate}%</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={statistics.verificationRate} className="h-3" />
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Verified: {statistics.verified}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Pending: {statistics.pending}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Rejected: {statistics.rejected}</span>
                  </div>
                </div>
                <span className="text-muted-foreground">
                  {statistics.resubmission} awaiting resubmission
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Filters and Controls */}
        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search company, email, bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/10">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="resubmission_required">Resubmission Required</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Actions */}
            {selectedRows.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                  {selectedRows.length} selected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('verify')}
                  disabled={bulkProcessing}
                  className="border-green-500/30 hover:bg-green-500/20"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verify All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkProcessing}
                  className="border-red-500/30 hover:bg-red-500/20"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject All
                </Button>
              </div>
            )}

            {/* Refresh Button */}
            <Button 
              onClick={fetchRows} 
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
              <span>{filteredAndSortedRows.length} submissions</span>
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
              >
                <Download className="h-3 w-3 mr-1" />
                Export Data
              </Button>
            </div>
          </div>
        </div>

        {/* Banking Table */}
        {filteredAndSortedRows.length === 0 ? (
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
                        checked={selectedRows.length === filteredAndSortedRows.length}
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
                    <TableHead 
                      onClick={() => handleSort('bank_name')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Bank {sortConfig?.key === 'bank_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Account Holder</TableHead>
                    <TableHead>Account Details</TableHead>
                    <TableHead 
                      onClick={() => handleSort('status')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('submission_date')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Submitted {sortConfig?.key === 'submission_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedRows.map((row) => {
                    const isSelected = selectedRows.includes(row.banking_id)
                    const isPending = row.status === 'pending'
                    
                    return (
                      <TableRow 
                        key={row.banking_id}
                        className={`
                          border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer
                          ${isSelected ? 'bg-white/10' : ''}
                        `}
                        onClick={() => handleViewDetails(row)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(row.banking_id)}
                            className="rounded border-white/30 bg-white/10"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{row.company_name || "Unknown"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{row.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{row.bank_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{row.account_holder_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Acc:</span>
                              <span>{row.account_number_masked || "••••"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Route:</span>
                              <span>{row.routing_number_masked || "••••"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(row.status)}
                            {isPending && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Review needed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(row.submission_date)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{new Date(row.submission_date).toLocaleString()}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            {row.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAction(row.banking_id, 'verify')}
                                  disabled={processingId === row.banking_id}
                                  className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30"
                                >
                                  {processingId === row.banking_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAction(row.banking_id, 'reject')}
                                  disabled={processingId === row.banking_id}
                                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
                                >
                                  {processingId === row.banking_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CircleSlash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              onClick={() => handleViewDetails(row)}
                              className="bg-white/10 hover:bg-white/20 border border-white/10"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
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

        {/* Enhanced Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setDetails(null)
            setDecisionNotes("")
          }
          setShowDetailsDialog(open)
        }}>
          <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Banking Details Verification
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Review and verify banking information
              </DialogDescription>
            </DialogHeader>
            
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                <span className="text-sm text-muted-foreground">Decrypting banking details...</span>
              </div>
            ) : details ? (
              <div className="space-y-6">
                {/* Status Card */}
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                        {getStatusBadge(details.status)}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-2">Security</p>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium">End-to-end encrypted</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Banking Information */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-400" />
                      Banking Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <InfoRow label="Bank Name" value={details.bank_name} />
                        <InfoRow label="Account Holder" value={details.account_holder_name} />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-white/5">
                          <span className="text-sm text-muted-foreground">Account Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">
                              {details.account_number_full || details.account_number_masked || "Unavailable"}
                            </span>
                            {details.account_number_full && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(details.account_number_full!, "Account number")}
                                className="h-6 w-6 p-0 hover:bg-white/10"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-white/5">
                          <span className="text-sm text-muted-foreground">Routing Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">
                              {details.routing_number_full || details.routing_number_masked || "Unavailable"}
                            </span>
                            {details.routing_number_full && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(details.routing_number_full!, "Routing number")}
                                className="h-6 w-6 p-0 hover:bg-white/10"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {(details.swift_code || details.iban) && (
                      <Separator className="bg-white/10" />
                    )}
                    
                    {details.swift_code && (
                      <InfoRow label="SWIFT Code" value={details.swift_code} />
                    )}
                    {details.iban && (
                      <InfoRow label="IBAN" value={details.iban} />
                    )}
                    {details.bank_address && (
                      <InfoRow label="Bank Address" value={details.bank_address} icon={MapPin} />
                    )}
                  </CardContent>
                </Card>
                
                {/* Company Information */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-400" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label="Company" value={details.company_name || "Unknown"} />
                    <InfoRow label="Contact Email" value={details.email} icon={Mail} />
                    <InfoRow label="Submitted" value={new Date(details.submission_date).toLocaleString()} icon={Calendar} />
                    {details.verification_date && (
                      <InfoRow 
                        label="Verified" 
                        value={new Date(details.verification_date).toLocaleString()} 
                        icon={CheckCircle}
                      />
                    )}
                  </CardContent>
                </Card>
                
                {/* Previous Notes */}
                {details.verification_notes && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-amber-400" />
                        Previous Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {details.verification_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Decision Section */}
                {selected?.status === 'pending' && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle>Make a Decision</CardTitle>
                      <CardDescription>Review and verify the banking details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="notes" className="text-sm font-medium mb-2">
                          Verification Notes (optional)
                        </Label>
                        <Textarea 
                          id="notes"
                          value={decisionNotes} 
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          className="min-h-24 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20"
                          placeholder="Add any notes about this verification..."
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button 
                          onClick={() => handleAction(selected.banking_id, 'resubmission_required')}
                          disabled={processingId === selected.banking_id}
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30"
                        >
                          {processingId === selected.banking_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Request Resubmission
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleAction(selected.banking_id, 'reject')}
                          disabled={processingId === selected.banking_id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {processingId === selected.banking_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CircleSlash2 className="h-4 w-4 mr-2" />
                              Reject
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleAction(selected.banking_id, 'verify')}
                          disabled={processingId === selected.banking_id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {processingId === selected.banking_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Verify
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No banking details available</p>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDetailsDialog(false)}
                className="border-white/20 hover:bg-white/10"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  <div className="flex items-center justify-between py-2 border-b border-white/5">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3" />}
      {label}:
    </span>
    <span className="font-medium text-right">{value}</span>
  </div>
)

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
    
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardContent className="p-6">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
    
    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
    
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-white/5 last:border-0">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
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
    <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
    <h3 className="text-xl font-semibold mb-2">No banking submissions found</h3>
    <p className="text-muted-foreground max-w-md mx-auto">
      No banking submissions match your current filters. Try adjusting your search criteria or changing the status filter.
    </p>
    <Button variant="outline" className="mt-6 border-white/20 hover:bg-white/10">
      <RefreshCw className="h-4 w-4 mr-2" />
      Clear Filters
    </Button>
  </div>
)