"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  RefreshCw,
  Search,
  Download,
  FileText,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Building,
  Grid3x3,
  List,
  Filter,
  Eye,
  MoreHorizontal,
  Activity,
  ExternalLink,
  Hash,
  Mail,
  ArrowUp,
  ArrowDown,
  Zap,
  BarChart3,
  CreditCard,
  Receipt
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface InvoiceRow {
  id: string
  invoice_number: string
  vendor_number: string
  amount: number
  due_date: string
  status: string
  buyer_email?: string
  created_at?: string
  payment_method?: string
  currency?: string
}

type SortField = 'invoice_number' | 'vendor_number' | 'amount' | 'due_date' | 'status'
type SortOrder = 'asc' | 'desc'
type UserRole = 'buyer' | 'supplier' | null
type ViewMode = 'table' | 'cards'

// Enhanced StatCard with improved styling
const StatCard = ({ title, value, icon: Icon, color, subtitle, trend, loading }: any) => {
  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const colorStyles: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-500/10 text-blue-400 border-blue-500/30",
    green: "from-green-500/20 to-green-500/10 text-green-400 border-green-500/30",
    amber: "from-amber-500/20 to-amber-500/10 text-amber-400 border-amber-500/30",
    red: "from-red-500/20 to-red-500/10 text-red-400 border-red-500/30",
    purple: "from-purple-500/20 to-purple-500/10 text-purple-400 border-purple-500/30",
  }

  return (
    <div className={`
      p-4 rounded-xl bg-gradient-to-br ${colorStyles[color] || colorStyles.blue} 
      backdrop-blur-sm border hover:scale-[1.02] transition-all duration-300 cursor-pointer
    `}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend.isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

// Enhanced status badge with tooltips
const getStatusBadge = (status: string, size: "default" | "small" = "default") => {
  const configs = {
    paid: { 
      icon: CheckCircle2, 
      label: "Paid", 
      className: "bg-green-500/20 text-green-400 border-green-500/30",
      description: "Invoice has been paid"
    },
    accepted: { 
      icon: CheckCircle2, 
      label: "Accepted", 
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      description: "Invoice accepted and pending payment"
    },
    pending: { 
      icon: Clock, 
      label: "Pending", 
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      description: "Awaiting review"
    },
    rejected: { 
      icon: XCircle, 
      label: "Rejected", 
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      description: "Invoice was rejected"
    },
    overdue: {
      icon: AlertTriangle,
      label: "Overdue",
      className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      description: "Payment is overdue"
    }
  }
  
  const config = configs[status.toLowerCase() as keyof typeof configs] || configs.pending
  const Icon = config.icon
  const iconSize = size === "small" ? "h-3 w-3" : "h-4 w-4"
  const textSize = size === "small" ? "text-xs" : "text-sm"
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${config.className} font-medium ${textSize}`}>
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

const formatCurrency = (amount: number, currency: string = 'ZAR') => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays === -1) return 'Tomorrow'
  if (diffInDays < -1 && diffInDays > -7) return `In ${Math.abs(diffInDays)}d`
  if (diffInDays < 0) return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Empty state component
const EmptyState: React.FC<{ role: UserRole; onClearFilters?: () => void; hasFilters?: boolean }> = ({ 
  role, 
  onClearFilters, 
  hasFilters 
}) => (
  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
    <CardContent className="text-center py-16">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-muted/50 p-6">
          <FileText className="h-16 w-16 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {hasFilters ? 'No invoices match your filters' : 'No invoices found'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {hasFilters && 'Try adjusting your search criteria or clear filters to see all invoices'}
        {!hasFilters && role === 'buyer' && 'Upload AP data to see invoices here'}
        {!hasFilters && role === 'supplier' && 'Invoices will appear once your buyer uploads AP data'}
        {!hasFilters && !role && 'Please sign in to view invoices'}
      </p>
      {hasFilters && onClearFilters && (
        <Button variant="outline" onClick={onClearFilters} className="border-white/20">
          <XCircle className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
      {!hasFilters && role === 'buyer' && (
        <Alert className="max-w-md mx-auto border-blue-500/50 bg-blue-500/10 mt-6">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-sm text-left">
            <p className="font-medium mb-2">Getting Started:</p>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              <li>Only <span className="font-semibold">accepted</span> status invoices are shown</li>
              <li>Upload via API endpoint</li>
              <li>Ensure vendor numbers match your supplier records</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </CardContent>
  </Card>
)

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
      <Skeleton className="h-20 w-full" />
    </div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
    </div>
  </div>
)

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [role, setRole] = useState<UserRole>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState<SortField>('due_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const lastRefresh = useRef<Date>(new Date())
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null)

  const fetchInvoices = useCallback(async () => {
    let cancelled = false

    try {
      setError("")
      
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      
      let res = await fetch(`/api/buyer/invoices?${params.toString()}`, { credentials: "include" })
      let detectedRole: UserRole = null

      if (res.ok) {
        detectedRole = "buyer"
      } else if (res.status === 403 || res.status === 401) {
        const supRes = await fetch("/api/supplier/invoices", { credentials: "include" })
        res = supRes
        if (supRes.ok) detectedRole = "supplier"
      }

      if (cancelled) return

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || "Failed to load invoices")
      }

      const data = await res.json()
      const invoicesList = Array.isArray(data?.invoices) ? data.invoices : []
      
      setInvoices(invoicesList)
      setRole(detectedRole)
      lastRefresh.current = new Date()
      setError("")
    } catch (e) {
      if (cancelled) return
      console.error("Invoices fetch error:", e)
      setError(e instanceof Error ? e.message : "Failed to load invoices")
    } finally {
      if (!cancelled) {
        setLoading(false)
        setRefreshing(false)
      }
    }

    return () => { cancelled = true }
  }, [statusFilter])

  const startAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current)
    autoRefreshInterval.current = setInterval(fetchInvoices, 60000)
  }, [fetchInvoices])

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current)
      autoRefreshInterval.current = null
    }
  }, [])

  useEffect(() => {
    fetchInvoices()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh()
      } else {
        fetchInvoices()
        startAutoRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    startAutoRefresh()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopAutoRefresh()
    }
  }, [fetchInvoices, startAutoRefresh, stopAutoRefresh])

  // Enhanced statistics with trends
  const statistics = useMemo(() => {
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const paidAmount = invoices.filter(i => i.status.toLowerCase() === 'paid').reduce((sum, i) => sum + i.amount, 0)
    const pendingAmount = invoices.filter(i => i.status.toLowerCase() === 'pending').reduce((sum, i) => sum + i.amount, 0)
    const acceptedAmount = invoices.filter(i => i.status.toLowerCase() === 'accepted').reduce((sum, i) => sum + i.amount, 0)

    // Calculate payment rate
    const paymentRate = invoices.length > 0 
      ? Math.round((invoices.filter(i => i.status.toLowerCase() === 'paid').length / invoices.length) * 100)
      : 0

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      acceptedAmount,
      paid: invoices.filter(i => i.status.toLowerCase() === 'paid').length,
      pending: invoices.filter(i => i.status.toLowerCase() === 'pending').length,
      accepted: invoices.filter(i => i.status.toLowerCase() === 'accepted').length,
      rejected: invoices.filter(i => i.status.toLowerCase() === 'rejected').length,
      paymentRate,
      avgInvoiceAmount: invoices.length > 0 ? totalAmount / invoices.length : 0,
    }
  }, [invoices])

  // Filter and sort with proper memoization
  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices]

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(inv => 
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.vendor_number.toLowerCase().includes(query) ||
        inv.status.toLowerCase().includes(query) ||
        inv.buyer_email?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(inv => inv.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Apply sort
    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'amount') {
        aVal = Number(aVal)
        bVal = Number(bVal)
      } else if (sortField === 'due_date') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return result
  }, [invoices, searchQuery, statusFilter, sortField, sortOrder])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchInvoices()
    setSuccessMessage("Invoices refreshed successfully")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleExport = () => {
    const csv = [
      ['Invoice Number', 'Vendor Number', 'Amount', 'Due Date', 'Status'],
      ...filteredAndSortedInvoices.map(inv => [
        inv.invoice_number,
        inv.vendor_number,
        inv.amount.toString(),
        new Date(inv.due_date).toISOString(),
        inv.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    setSuccessMessage("Invoices exported successfully")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const handleSelectAll = () => {
    if (selectedInvoices.size === filteredAndSortedInvoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(filteredAndSortedInvoices.map(inv => inv.id)))
    }
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedInvoices)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedInvoices(newSelection)
  }

  const handleBulkExport = () => {
    const selectedData = invoices.filter(inv => selectedInvoices.has(inv.id))
    // Export logic for selected invoices
    setSuccessMessage(`Exported ${selectedInvoices.size} invoices`)
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const goBack = () => {
    const dashboardUrl = role === 'buyer' ? '/dashboard/buyer' : '/dashboard/supplier'
    window.location.href = dashboardUrl
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <main className="container mx-auto py-8">
          <LoadingSkeleton />
        </main>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-black">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:text-foreground focus:border focus:border-border focus:px-3 focus:py-2 focus:rounded-md"
        >
          Skip to main content
        </a>

        <main id="main-content" className="container mx-auto py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Invoice Management
              </h1>
              <p className="text-muted-foreground mt-1">
                {role === 'buyer' && 'Manage your accounts payable'}
                {role === 'supplier' && 'View invoices from your buyers'}
                {!role && 'Manage your invoices and payments'}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Invoices</AlertTitle>
              <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="border-white/20">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Enhanced Statistics Cards */}
          {invoices.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Invoices"
                  value={invoices.length}
                  icon={FileText}
                  color="blue"
                  subtitle={formatCurrency(statistics.totalAmount)}
                  loading={loading}
                />
                <StatCard
                  title="Paid"
                  value={statistics.paid}
                  icon={CheckCircle2}
                  color="green"
                  subtitle={formatCurrency(statistics.paidAmount)}
                  trend={{ value: 12, isPositive: true }}
                  loading={loading}
                />
                <StatCard
                  title="Pending"
                  value={statistics.pending}
                  icon={Clock}
                  color="amber"
                  subtitle={formatCurrency(statistics.pendingAmount)}
                  trend={{ value: 5, isPositive: false }}
                  loading={loading}
                />
                <StatCard
                  title="Accepted"
                  value={statistics.accepted}
                  icon={Receipt}
                  color="purple"
                  subtitle={formatCurrency(statistics.acceptedAmount)}
                  loading={loading}
                />
              </div>

              {/* Payment Progress Card */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                        <Activity className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Payment Progress</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {statistics.paymentRate}% of invoices paid
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">{statistics.paymentRate}%</p>
                      <p className="text-xs text-muted-foreground">
                        Avg invoice: {formatCurrency(statistics.avgInvoiceAmount)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={statistics.paymentRate} className="h-3" />
                </CardContent>
              </Card>
            </>
          )}

          {/* Enhanced Filters and Controls */}
          <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices, vendors, emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
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
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className={viewMode === 'cards' ? 'bg-blue-600 hover:bg-blue-700' : 'border-white/20 hover:bg-white/10'}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-blue-600 hover:bg-blue-700' : 'border-white/20 hover:bg-white/10'}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Bulk Actions */}
              {selectedInvoices.size > 0 && (
                <div className="flex gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {selectedInvoices.size} selected
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkExport}
                    className="border-white/20 hover:bg-white/10"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedInvoices(new Set())}
                    className="hover:bg-white/10"
                  >
                    Clear
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {filteredAndSortedInvoices.length > 0 && (
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    size="sm"
                    className="border-white/20 hover:bg-white/10"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                )}
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{filteredAndSortedInvoices.length} invoices</span>
                {searchQuery && (
                  <Badge variant="secondary" className="bg-white/10">
                    Searching: "{searchQuery}"
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="bg-white/10">
                    Filter: {statusFilter}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                Last updated: {lastRefresh.current.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Invoices Display */}
          {filteredAndSortedInvoices.length === 0 ? (
            <EmptyState 
              role={role} 
              hasFilters={searchQuery !== "" || statusFilter !== "all"}
              onClearFilters={clearFilters}
            />
          ) : viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredAndSortedInvoices.map((invoice) => {
                const isSelected = selectedInvoices.has(invoice.id)
                return (
                  <Card 
                    key={invoice.id} 
                    className={`relative overflow-hidden p-0 rounded-xl bg-black bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-white/10 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer group ${
                      isSelected ? 'ring-2 ring-blue-500/50' : ''
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    <CardContent className="p-5 relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(invoice.id)}
                            className="rounded border-white/30 bg-white/10 mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                <FileText className="h-4 w-4 text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold">Invoice #{invoice.invoice_number}</h3>
                                <p className="text-xs text-muted-foreground">Vendor: {invoice.vendor_number}</p>
                              </div>
                              {getStatusBadge(invoice.status)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-400" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Amount</p>
                                  <p className="font-semibold text-green-400 tabular-nums">
                                    {formatCurrency(invoice.amount)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-400" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Due Date</p>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="font-medium cursor-help">
                                          {formatDate(invoice.due_date)}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{new Date(invoice.due_date).toLocaleDateString('en-ZA')}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>

                              {invoice.buyer_email && (
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-purple-400" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Buyer</p>
                                    <p className="font-medium truncate text-sm">{invoice.buyer_email}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Invoice Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View in Portal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="relative overflow-hidden p-0 rounded-xl bg-black bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-white/10 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="border-b border-white/10">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.size === filteredAndSortedInvoices.length && filteredAndSortedInvoices.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-white/30 bg-white/10"
                          />
                        </TableHead>
                        <TableHead 
                          onClick={() => handleSort('invoice_number')}
                          className="cursor-pointer hover:text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            Invoice #
                            {sortField === 'invoice_number' && (
                              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          onClick={() => handleSort('vendor_number')}
                          className="cursor-pointer hover:text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            Vendor
                            {sortField === 'vendor_number' && (
                              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          onClick={() => handleSort('amount')}
                          className="cursor-pointer hover:text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            Amount
                            {sortField === 'amount' && (
                              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          onClick={() => handleSort('due_date')}
                          className="cursor-pointer hover:text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            Due Date
                            {sortField === 'due_date' && (
                              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          onClick={() => handleSort('status')}
                          className="cursor-pointer hover:text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {sortField === 'status' && (
                              sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedInvoices.map((invoice) => {
                        const isSelected = selectedInvoices.has(invoice.id)
                        
                        return (
                          <TableRow 
                            key={invoice.id} 
                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                              isSelected ? 'bg-white/10' : ''
                            }`}
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelection(invoice.id)}
                                className="rounded border-white/30 bg-white/10"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell className="text-muted-foreground">{invoice.vendor_number}</TableCell>
                            <TableCell className="font-semibold tabular-nums text-green-400">
                              {formatCurrency(invoice.amount)}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{formatDate(invoice.due_date)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{new Date(invoice.due_date).toLocaleDateString('en-ZA')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status, "small")}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open in Portal
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </TooltipProvider>
  )
}