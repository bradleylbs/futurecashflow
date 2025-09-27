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
  ChevronLeft,
  Filter,
  Calendar,
  DollarSign,
  Building2,
  Eye,
  MoreVertical,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
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

const getStatusConfig = (status: string) => {
  const s = status.toLowerCase()
  if (s === 'paid') return {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    darkColor: 'dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
  }
  if (s === 'accepted') return {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Eye,
    darkColor: 'dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
  }
  if (s === 'pending') return {
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
    darkColor: 'dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
  }
  if (s === 'rejected') return {
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    darkColor: 'dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
  }
  return {
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: AlertTriangle,
    darkColor: 'dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
  }
}

const StatsCard = ({ title, value, icon: Icon, trend, color = "default" }: {
  title: string
  value: string | number
  icon: any
  trend?: { value: number, label: string }
  color?: "default" | "success" | "warning" | "danger"
}) => {
  const colorClasses = {
    default: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
    success: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20",
    warning: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20",
    danger: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
  }

  return (
    <Card className={`${colorClasses[color]} border-0 shadow-sm hover:shadow-md transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <div className="flex items-center mt-2 text-xs">
                <TrendingUp className={`h-3 w-3 mr-1 ${trend.value > 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                <span className={trend.value > 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-muted-foreground ml-1">{trend.label}</span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-white/50 dark:bg-gray-800/50 p-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const EmptyState: React.FC<{ role: UserRole, searchQuery?: string }> = ({ role, searchQuery }) => {
  if (searchQuery) {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 p-8">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No results found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn't find any invoices matching "{searchQuery}". Try adjusting your search terms.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Clear Search
        </Button>
      </div>
    )
  }

  return (
    <div className="text-center py-16 space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 p-8">
          <FileText className="h-12 w-12 text-blue-600" />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">No invoices yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {role === 'buyer' && 'Upload your AP data to get started with invoice management'}
          {role === 'supplier' && 'Your invoices will appear here once buyers upload their AP data'}
          {!role && 'Sign in to view and manage your invoices'}
        </p>
      </div>
      
      {role === 'buyer' && (
        <Card className="max-w-lg mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 text-left">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Quick Start Guide</h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600" />
                Only accepted invoices are displayed
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600" />
                Upload via <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-mono">POST /api/buyer/invoices/upload</code>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600" />
                Ensure vendor numbers match your supplier records
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
      
      {role === 'supplier' && (
        <Card className="max-w-lg mx-auto bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6 text-left">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">Not seeing invoices?</h4>
            <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
                Your buyer must have your vendor number on file
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
                Only accepted status invoices are shown
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
                Contact your buyer to add you under Suppliers
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {/* Stats skeletons */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Table skeletons */}
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
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
      
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockInvoices: InvoiceRow[] = [
        {
          id: '1',
          invoice_number: 'INV-2024-001',
          vendor_number: 'VEN-001',
          amount: 12500.00,
          due_date: '2024-12-15',
          status: 'accepted'
        },
        {
          id: '2',
          invoice_number: 'INV-2024-002',
          vendor_number: 'VEN-002',
          amount: 8750.50,
          due_date: '2024-12-20',
          status: 'paid'
        },
        {
          id: '3',
          invoice_number: 'INV-2024-003',
          vendor_number: 'VEN-003',
          amount: 15000.00,
          due_date: '2024-11-30',
          status: 'pending'
        },
        {
          id: '4',
          invoice_number: 'INV-2024-004',
          vendor_number: 'VEN-001',
          amount: 3200.75,
          due_date: '2024-12-10',
          status: 'rejected'
        },
        {
          id: '5',
          invoice_number: 'INV-2024-005',
          vendor_number: 'VEN-004',
          amount: 22100.00,
          due_date: '2024-12-25',
          status: 'accepted'
        }
      ]
      
      if (cancelled) return

      setInvoices(mockInvoices)
      setFilteredInvoices(mockInvoices)
      setRole('buyer') // Mock role
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

  // Calculate stats
  const stats = {
    total: filteredInvoices.length,
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    paid: filteredInvoices.filter(inv => inv.status.toLowerCase() === 'paid').length,
    pending: filteredInvoices.filter(inv => inv.status.toLowerCase() === 'pending').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:border-2 focus:border-blue-500 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      <main id="main-content" className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Invoice Management
                </h1>
                <p className="text-muted-foreground">
                  {role === 'buyer' && 'Manage your accounts payable with real-time insights'}
                  {role === 'supplier' && 'Track invoices and payment status from your buyers'}
                  {!role && 'Comprehensive invoice and payment management'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {filteredInvoices.length > 0 && (
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-200">Unable to Load Invoices</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-red-700 dark:text-red-300">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Invoices"
              value={stats.total}
              icon={FileText}
              trend={{ value: 12, label: "this month" }}
              color="default"
            />
            <StatsCard
              title="Total Amount"
              value={`R ${stats.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              trend={{ value: 8, label: "vs last month" }}
              color="success"
            />
            <StatsCard
              title="Paid"
              value={stats.paid}
              icon={CheckCircle2}
              color="success"
            />
            <StatsCard
              title="Pending"
              value={stats.pending}
              icon={Clock}
              color="warning"
            />
          </div>
        )}

        {/* Main Table Card */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Invoice Details
                </CardTitle>
                <CardDescription>
                  {!loading && `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''} found`}
                  {!loading && ` • Updated ${lastRefresh.current.toLocaleTimeString()}`}
                </CardDescription>
              </div>
              
              {!loading && invoices.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices, vendors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <EmptyState role={role} searchQuery={searchQuery} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-slate-50/50 dark:bg-slate-800/50">
                    <tr>
                      {[
                        { key: 'invoice_number', label: 'Invoice Number', icon: FileText },
                        { key: 'vendor_number', label: 'Vendor', icon: Building2 },
                        { key: 'amount', label: 'Amount', icon: DollarSign },
                        { key: 'due_date', label: 'Due Date', icon: Calendar },
                        { key: 'status', label: 'Status', icon: null }
                      ].map(({ key, label, icon: Icon }) => (
                        <th key={key} className="text-left py-4 px-6 font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort(key as SortField)}
                            className="h-auto p-0 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 -ml-2"
                          >
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4" />}
                              {label}
                              <ArrowUpDown className={`h-3 w-3 transition-transform ${sortField === key ? 'text-blue-600' : 'text-muted-foreground'}`} />
                            </div>
                          </Button>
                        </th>
                      ))}
                      <th className="text-left py-4 px-6 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice, index) => {
                      const statusConfig = getStatusConfig(invoice.status)
                      const StatusIcon = statusConfig.icon
                      
                      return (
                        <tr 
                          key={invoice.id} 
                          className={`
                            border-b last:border-0 transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50
                            ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'}
                          `}
                        >
                          <td className="py-4 px-6">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {invoice.invoice_number}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-slate-600 dark:text-slate-400">
                              {invoice.vendor_number}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              R {Number(invoice.amount).toLocaleString('en-ZA', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-slate-600 dark:text-slate-400">
                              {new Date(invoice.due_date).toLocaleDateString('en-ZA', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <Badge className={`${statusConfig.color} ${statusConfig.darkColor} border font-medium px-3 py-1 inline-flex items-center gap-1.5`}>
                              <StatusIcon className="h-3 w-3" />
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </div>
        </div>

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </main>
    </div>
  )
}