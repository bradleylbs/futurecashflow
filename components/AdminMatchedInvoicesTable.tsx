"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Search, 
  Download, 
  AlertCircle, 
  RefreshCw, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp
} from "lucide-react"

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface MatchedInvoice {
  id: number
  invoice_number: string
  supplier_name: string
  amount: number
  status: 'matched' | 'processing' | 'completed' | 'failed'
  matched_at: string
  buyer_name?: string
  payment_date?: string
  currency?: string
}

interface InvoicesResponse {
  invoices: MatchedInvoice[]
  total: number
  page: number
  limit: number
  stats?: {
    total_matched: number
    total_amount: number
    pending_count: number
    completed_count: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<MatchedInvoice['status'], string> = {
  'matched': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'processing': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'completed': 'bg-green-500/10 text-green-500 border-green-500/20',
  'failed': 'bg-red-500/10 text-red-500 border-red-500/20',
}

const TIME_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
]

// ============================================================================
// Utility Functions
// ============================================================================

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color?: 'blue' | 'green' | 'amber' | 'red'
}

const colorMap: Record<'blue' | 'green' | 'amber' | 'red', { bg: string; border: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-500" },
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
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
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
)

const EmptyState = () => (
  <div className="text-center py-12">
    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
    <h3 className="text-lg font-semibold mb-2">No Matched Invoices</h3>
    <p className="text-sm text-muted-foreground">
      No invoices have been matched yet
    </p>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

const AdminMatchedInvoicesTable: React.FC = () => {
  const [invoices, setInvoices] = useState<MatchedInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [selectedInvoice, setSelectedInvoice] = useState<MatchedInvoice | null>(null)
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState<InvoicesResponse['stats']>()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        q: debouncedQuery,
        page: page.toString(),
        limit: limit.toString(),
      })

      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (timeFilter !== 'all') params.append('time', timeFilter)

      const response = await fetch(`/api/admin/invoices/matched?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to fetch matched invoices')

      const data: InvoicesResponse = await response.json()
      setInvoices(data.invoices || [])
      setTotal(data.total || 0)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matched invoices')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, page, limit, statusFilter, timeFilter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // Export handler
  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/admin/invoices/matched/export', {
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `matched-invoices-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to export invoices')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set(invoices.map(inv => inv.supplier_name))
    return Array.from(suppliers).sort()
  }, [invoices])

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Matched" 
          value={stats?.total_matched || 0}
          subtitle="Invoices matched"
          icon={FileText}
          color="blue"
        />
        <StatsCard 
          title="Total Amount" 
          value={formatCurrency(stats?.total_amount || 0)}
          subtitle="Combined value"
          icon={DollarSign}
          color="green"
        />
        <StatsCard 
          title="Processing" 
          value={stats?.pending_count || 0}
          subtitle="Pending processing"
          icon={Clock}
          color="amber"
        />
        <StatsCard 
          title="Completed" 
          value={stats?.completed_count || 0}
          subtitle="Successfully processed"
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search matched invoices"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by time">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_FILTERS.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={fetchInvoices}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={exporting}
            className="flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Matched Invoices Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Matched Invoices
              </CardTitle>
              <CardDescription>
                Showing {invoices.length} of {total} matched invoices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead className="w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-white/5">
                        <TableCell>
                          <span className="font-mono text-sm">
                            {invoice.invoice_number}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {invoice.supplier_name}
                            </span>
                            {invoice.buyer_name && (
                              <span className="text-xs text-muted-foreground">
                                Buyer: {invoice.buyer_name}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-semibold">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={STATUS_COLORS[invoice.status]}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {formatRelativeTime(invoice.matched_at)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(invoice.matched_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete information for this matched invoice
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Invoice Number
                  </label>
                  <p className="text-sm mt-1 font-mono">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Amount
                  </label>
                  <p className="text-sm mt-1 font-semibold">
                    {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Supplier
                  </label>
                  <p className="text-sm mt-1">{selectedInvoice.supplier_name}</p>
                </div>
                {selectedInvoice.buyer_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Buyer
                    </label>
                    <p className="text-sm mt-1">{selectedInvoice.buyer_name}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={STATUS_COLORS[selectedInvoice.status]}
                    >
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Matched At
                  </label>
                  <p className="text-sm mt-1">
                    {new Date(selectedInvoice.matched_at).toLocaleString()}
                  </p>
                </div>
                {selectedInvoice.payment_date && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Payment Date
                    </label>
                    <p className="text-sm mt-1">
                      {new Date(selectedInvoice.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminMatchedInvoicesTable