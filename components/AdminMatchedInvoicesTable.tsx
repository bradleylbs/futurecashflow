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
  TrendingUp,
  Edit,
  Link,
  Info
} from "lucide-react"

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface Supplier {
  id: string
  supplier_name: string
  invoice_count: number
  total_amount: number
  buyer_name: string
  match_status: "matched" | "new_profile" | "conflict" | "missing_data"
  returning_supplier: boolean
  vendor_numbers: string[]
  currency: string
  last_invoice_date: string
  supplier_id?: string
  invoices?: Invoice[]
}

interface Invoice {
  id: number
  invoice_number: string
  vendor_number: string
  amount: number
  due_date: string
  validation_status: string
  created_at: string
  batch_total: number
  batch_date: string
  payment_status?: string
  payment_date?: string
  payment_reference?: string
}

interface SuppliersResponse {
  suppliers: Supplier[]
  total: number
  page: number
  limit: number
  stats: {
    total_suppliers: number
    matched_suppliers: number
    new_suppliers: number
    conflict_suppliers: number
    missing_data_suppliers: number
    total_invoice_count: number
    total_amount: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<Supplier["match_status"], string> = {
  matched: "bg-success/10 text-success border-success/20",
  new_profile: "bg-primary/10 text-primary border-primary/20",
  conflict: "bg-error/10 text-error border-error/20",
  missing_data: "bg-muted text-muted-foreground border-border/20",
}

const STATUS_LABELS: Record<Supplier["match_status"], string> = {
  matched: "Matched",
  new_profile: "New Profile",
  conflict: "Conflict",
  missing_data: "Missing Data",
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

const formatCurrency = (amount: number, currency = "ZAR"): string => {
  if (currency === "ZAR") {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
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

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A"
  try {
    return new Date(dateString).toLocaleDateString("en-ZA")
  } catch {
    return "Invalid Date"
  }
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
  blue: { bg: "bg-primary/10", border: "border-primary/20", icon: "text-primary" },
  green: { bg: "bg-success/10", border: "border-success/20", icon: "text-success" },
  amber: { bg: "bg-warning/10", border: "border-warning/20", icon: "text-warning" },
  red: { bg: "bg-error/10", border: "border-error/20", icon: "text-error" },
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
    <h3 className="text-lg font-semibold mb-2">No Matched Suppliers</h3>
    <p className="text-sm text-muted-foreground">
      No supplier matches found for the current filters
    </p>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

const AdminMatchedInvoicesTable: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(25)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<Invoice[]>([])
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState<SuppliersResponse['stats'] | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
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

      if (!response.ok) throw new Error('Failed to fetch supplier matches')

      const data: SuppliersResponse = await response.json()
      setSuppliers(data.suppliers || [])
      setTotal(data.total || 0)
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load supplier matches')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, page, limit, statusFilter, timeFilter])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  // Handle view details
  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setInvoiceDetails(supplier.invoices || [])
  }

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
      a.download = `supplier-matches-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to export supplier matches')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  return (
    <div className="space-y-6 p-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Total Suppliers" 
            value={stats.total_suppliers}
            subtitle="Unique suppliers"
            icon={FileText}
            color="blue"
          />
          <StatsCard 
            title="Total Invoices" 
            value={stats.total_invoice_count}
            subtitle="Combined invoices"
            icon={TrendingUp}
            color="green"
          />
          <StatsCard 
            title="Combined Value" 
            value={formatCurrency(stats.total_amount)}
            subtitle="Total amount"
            icon={DollarSign}
            color="amber"
          />
          <StatsCard 
            title="Matched" 
            value={stats.matched_suppliers}
            subtitle="Successfully matched"
            icon={CheckCircle2}
            color="green"
          />
        </div>
      )}


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
              placeholder="Search by supplier, invoice, or PO number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search suppliers"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="new_profile">New Profile</SelectItem>
              <SelectItem value="conflict">Conflict</SelectItem>
              <SelectItem value="missing_data">Missing Data</SelectItem>
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
            onClick={fetchSuppliers}
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

      {/* Supplier Matching Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Supplier Matching Dashboard
              </CardTitle>
              <CardDescription>
                Showing {startItem} to {endItem} of {total} suppliers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : suppliers.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Invoice Count</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Buyer Name</TableHead>
                      <TableHead>Match Status</TableHead>
                      <TableHead>Returning Supplier</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="hover:bg-white/5">
                        <TableCell>
                          <span className="font-medium text-sm">
                            {supplier.supplier_name}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm">
                            {supplier.invoice_count}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-semibold text-sm">
                            {formatCurrency(supplier.total_amount, supplier.currency)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm">
                            {supplier.buyer_name}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={STATUS_COLORS[supplier.match_status]}
                          >
                            {STATUS_LABELS[supplier.match_status]}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={supplier.returning_supplier 
                              ? "bg-gray-900 text-white border-gray-900" 
                              : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {supplier.returning_supplier ? "Yes" : "No"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(supplier)}
                              aria-label="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {supplier.match_status === "conflict" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Link"
                              >
                                <Link className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Rows per page:
                  </span>
                  <Select 
                    value={limit.toString()} 
                    onValueChange={(value) => setLimit(Number(value))}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <div className="text-sm text-muted-foreground mx-2">
                    Page {page} of {totalPages}
                  </div>
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

      {/* Supplier Detail Dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supplier Invoice Details</DialogTitle>
            <DialogDescription>
              All invoices for {selectedSupplier?.supplier_name}
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-4">
              {/* Supplier Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Supplier</div>
                  <div className="text-sm font-semibold">{selectedSupplier.supplier_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Amount</div>
                  <div className="text-sm font-semibold">
                    {formatCurrency(selectedSupplier.total_amount, selectedSupplier.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Invoice Count</div>
                  <div className="text-sm font-semibold">{selectedSupplier.invoice_count}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge 
                    variant="outline" 
                    className={STATUS_COLORS[selectedSupplier.match_status]}
                  >
                    {STATUS_LABELS[selectedSupplier.match_status]}
                  </Badge>
                </div>
              </div>

              {/* Invoice Details Table */}
              <div className="border border-border/50 rounded-lg overflow-hidden">
                {invoiceDetails.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No invoice details available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Vendor Number</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetails.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono text-sm">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {invoice.vendor_number}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(invoice.amount)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(invoice.due_date)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                                {invoice.validation_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(invoice.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
