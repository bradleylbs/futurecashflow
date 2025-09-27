"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  RefreshCw,
  Search,
  Download,
  FileText,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft
} from "lucide-react"

interface InvoiceRow {
  id: string
  invoice_number: string
  vendor_number: string
  amount: number
  due_date: string
  status: string
  buyer_email?: string
}

type SortField = 'invoice_number' | 'vendor_number' | 'amount' | 'due_date' | 'status'
type SortOrder = 'asc' | 'desc'
type UserRole = 'buyer' | 'supplier' | null

const getStatusColor = (status: string): string => {
  const s = status.toLowerCase()
  if (s === 'paid') return 'bg-green-500/10 text-green-500 border-green-500/20'
  if (s === 'accepted') return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  if (s === 'pending') return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  if (s === 'rejected') return 'bg-red-500/10 text-red-500 border-red-500/20'
  return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
}

const EmptyState: React.FC<{ role: UserRole }> = ({ role }) => (
  <div className="text-center py-12 space-y-4">
    <div className="flex justify-center">
      <div className="rounded-full bg-muted p-6">
        <FileText className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
    <div>
      <h3 className="text-lg font-semibold">No invoices found</h3>
      <p className="text-sm text-muted-foreground mt-2">
        {role === 'buyer' && 'Upload AP data to see invoices here'}
        {role === 'supplier' && 'Invoices will appear once your buyer uploads AP data'}
        {!role && 'Please sign in to view invoices'}
      </p>
    </div>
    {role === 'buyer' && (
      <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
        <p className="text-sm font-medium mb-2">Getting Started:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Only <span className="font-semibold">accepted</span> status invoices are shown</li>
          <li>Upload via <code className="bg-background px-1 rounded text-xs">POST /api/buyer/invoices/upload</code></li>
          <li>Ensure vendor numbers match your supplier records</li>
        </ul>
      </div>
    )}
    {role === 'supplier' && (
      <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
        <p className="text-sm font-medium mb-2">Why am I not seeing invoices?</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Your buyer must consent your <span className="font-semibold">vendor_number</span></li>
          <li>Only <span className="font-semibold">accepted</span> status invoices are shown</li>
          <li>Contact your buyer to add you under Suppliers</li>
        </ul>
      </div>
    )}
  </div>
)

const LoadingSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
)

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceRow[]>([])
  const [role, setRole] = useState<UserRole>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>('due_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [refreshing, setRefreshing] = useState(false)
  const lastRefresh = useRef<Date>(new Date())
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null)

  const fetchInvoices = useCallback(async () => {
    let cancelled = false

    try {
      setError("")
      
      // Try buyer first, fallback to supplier
      let res = await fetch("/api/buyer/invoices", { credentials: "include" })
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
      setFilteredInvoices(invoicesList)
      setRole(detectedRole)
      lastRefresh.current = new Date()
    } catch (e) {
      if (cancelled) return
      console.error("Invoices fetch error:", e)
      setError(e instanceof Error ? e.message : "Failed to load invoices")
    } finally {
      if (!cancelled) setLoading(false)
    }

    return () => { cancelled = true }
  }, [])

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

  // Search and filter
  useEffect(() => {
    let result = [...invoices]

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(inv => 
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.vendor_number.toLowerCase().includes(query) ||
        inv.status.toLowerCase().includes(query)
      )
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

    setFilteredInvoices(result)
  }, [invoices, searchQuery, sortField, sortOrder])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchInvoices()
    setTimeout(() => setRefreshing(false), 500)
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
      ...filteredInvoices.map(inv => [
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
  }

  const goBack = () => {
    const dashboardUrl = role === 'buyer' ? '/dashboard/buyer' : '/dashboard/supplier'
    window.location.href = dashboardUrl
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
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
            <h1 className="text-3xl font-bold">Invoice Management</h1>
            <p className="text-muted-foreground">
              {role === 'buyer' && 'Manage your accounts payable'}
              {role === 'supplier' && 'View invoices from your buyers'}
              {!role && 'Manage your invoices and payments'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              aria-label="Refresh invoices"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            {filteredInvoices.length > 0 && (
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                aria-label="Export invoices to CSV"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Invoices</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>
                  {!loading && `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''} found`}
                  {!loading && ` • Last updated: ${lastRefresh.current.toLocaleTimeString()}`}
                </CardDescription>
              </div>
              {invoices.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Search invoices by number, vendor, or status"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton />
            ) : filteredInvoices.length === 0 && !searchQuery ? (
              <EmptyState role={role} />
            ) : filteredInvoices.length === 0 && searchQuery ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No invoices match your search</p>
                <Button
                  variant="link"
                  onClick={() => setSearchQuery("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <caption className="sr-only">
                    List of invoices with sorting and filtering capabilities
                  </caption>
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('invoice_number')}
                          className="-ml-3"
                          aria-label={`Sort by invoice number ${sortField === 'invoice_number' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : ''}`}
                        >
                          Invoice #
                          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
                        </Button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('vendor_number')}
                          className="-ml-3"
                          aria-label={`Sort by vendor number ${sortField === 'vendor_number' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : ''}`}
                        >
                          Vendor
                          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
                        </Button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('amount')}
                          className="-ml-3"
                          aria-label={`Sort by amount ${sortField === 'amount' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : ''}`}
                        >
                          Amount
                          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
                        </Button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('due_date')}
                          className="-ml-3"
                          aria-label={`Sort by due date ${sortField === 'due_date' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : ''}`}
                        >
                          Due Date
                          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
                        </Button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('status')}
                          className="-ml-3"
                          aria-label={`Sort by status ${sortField === 'status' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : ''}`}
                        >
                          Status
                          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium">{row.invoice_number}</td>
                        <td className="py-3 px-4">{row.vendor_number}</td>
                        <td className="py-3 px-4">R {Number(row.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4">{new Date(row.due_date).toLocaleDateString('en-ZA')}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(row.status)}>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex gap-2">
          <Button
            onClick={goBack}
            variant="outline"
          >
            <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
}