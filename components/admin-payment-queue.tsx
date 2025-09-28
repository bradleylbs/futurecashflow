// components/admin-payment-queue.tsx
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  MoreHorizontal,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Building,
  FileText,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Info,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  Hash,
  ExternalLink,
  Users,
} from "lucide-react"

// Enhanced interfaces
interface PaymentOffer {
  id: string
  payment_id: string // CRITICAL: This is now the payments.id
  supplier: string
  supplier_company_name?: string
  buyer: string
  invoice_number: string
  vendor_number: string
  amount: number
  offered_amount: number
  fee_percent: number
  fee_amount: number
  banking_details: {
    bank_name?: string
    account_holder_name?: string
    account_number?: string
    routing_number?: string
    status?: string
  }
  status: "pending" | "paid" | "failed" | "reversed" // Updated to match payments.status
  created_at: string
  accepted_at?: string
  due_date?: string
}

interface AdminPaymentQueueProps {
  refreshTrigger?: number
  tabActive?: boolean
}

// PaymentStatsCard component (keep the same as before)
const PaymentStatsCard: React.FC<{
  title: string
  value: string | number
  icon: React.ElementType
  color?: string
  trend?: { value: number; isPositive: boolean }
  loading?: boolean
}> = ({ title, value, icon: Icon, color = "blue", trend, loading }) => {
  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  const colorStyles: Record<string, string> = {
    blue: "from-blue-500/20 to-indigo-500/20 text-blue-400",
    green: "from-green-500/20 to-emerald-500/20 text-green-400",
    amber: "from-amber-500/20 to-orange-500/20 text-amber-400",
    purple: "from-purple-500/20 to-pink-500/20 text-purple-400",
  }

  return (
    <div className={`
      relative overflow-hidden p-4 rounded-xl bg-gradient-to-br ${(colorStyles as Record<string, string>)[color] || colorStyles.blue} 
      backdrop-blur-sm border border-white/10 hover:border-white/20 
      transition-all duration-300 hover:scale-[1.02] cursor-pointer group
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(trend.value)}% from last period</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export function AdminPaymentQueue({ refreshTrigger, tabActive }: AdminPaymentQueueProps) {
  const [offers, setOffers] = useState<PaymentOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOffer, setSelectedOffer] = useState<PaymentOffer | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  
  // Reset dialog state when tab changes
  useEffect(() => {
    if (typeof tabActive !== "undefined" && !tabActive) {
      setShowDetailsDialog(false)
      setSelectedOffer(null)
    }
  }, [tabActive])

  // Fetch payment offers from API
  const fetchOffers = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/payments/queue", { credentials: "include" })

      if (!response.ok) {
        const msg = await response.text().catch(() => "")
        throw new Error(`Failed to fetch payment queue (${response.status}) ${msg}`)
      }

      const data = await response.json()
      
      // UPDATED MAPPING: Use payment_id as the primary ID
      const mappedOffers = Array.isArray(data) ? data.map((item: any) => ({
        id: item.payment_id, // Use payment_id as the main ID
        payment_id: item.payment_id, // Explicit payment_id
        supplier: item.supplier_email,
        supplier_company_name: item.supplier_company_name,
        buyer: item.buyer_email,
        invoice_number: item.invoice_number,
        vendor_number: item.vendor_number,
        amount: Number(item.amount),
        offered_amount: Number(item.offered_amount),
        fee_percent: Number(item.fee_percent),
        fee_amount: Number(item.fee_amount),
        banking_details: {
          bank_name: item.bank_name,
          account_holder_name: item.account_holder_name,
          account_number: item.account_number,
          routing_number: item.routing_number,
          status: item.banking_status
        },
        status: item.payment_status, // Use payment status from payments table
        created_at: item.payment_created,
        accepted_at: item.accepted_at,
        due_date: item.due_date
      })) : []
      
      setOffers(mappedOffers)
      setError("")
    } catch (error) {
      setError("Failed to load payment queue. Please try refreshing the page.")
      console.error("Fetch payment queue error:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers, refreshTrigger])

  // Status badge for PAYMENTS status (not early payment offers status)
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        variant: "secondary" as const, 
        icon: Clock, 
        label: "Pending", 
        bgClass: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30"
      },
      paid: { 
        variant: "default" as const, 
        icon: CheckCircle, 
        label: "Paid", 
        bgClass: "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30"
      },
      failed: { 
        variant: "destructive" as const, 
        icon: XCircle, 
        label: "Failed", 
        bgClass: "bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30"
      },
      reversed: { 
        variant: "outline" as const, 
        icon: AlertCircle, 
        label: "Reversed", 
        bgClass: "bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-400 border-gray-500/30"
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${config.bgClass} font-medium`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Banking status badge (keep the same)
  const getBankingStatus = (bankingDetails: PaymentOffer['banking_details']) => {
    if (!bankingDetails.bank_name || !bankingDetails.account_number) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="flex items-center gap-1.5 bg-gray-500/20 text-gray-400 border-gray-500/30">
                <CreditCard className="h-3 w-3" />
                Not Provided
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Banking details not yet submitted</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    
    if (bankingDetails.status === 'verified') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="flex items-center gap-1.5 bg-green-500/20 text-green-400 border-green-500/30">
                <Shield className="h-3 w-3" />
                Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Banking details have been verified</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30">
              <AlertCircle className="h-3 w-3" />
              Pending
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Banking details pending verification</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available"
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`
    }
    
    return date.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // UPDATED: Handle payment approval - use payment_id directly
  const handleApprove = async (offer: PaymentOffer) => {
    try {
      // Use payment_id directly from the offer object
      const paymentId = offer.payment_id
      if (!paymentId) {
        setError("Payment record not found. Cannot approve.")
        setTimeout(() => setError(""), 5000)
        return
      }
      
      setProcessingId(paymentId)
      const response = await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId })
      })
      
      if (response.ok) {
        setOffers(prev => prev.map(o => o.payment_id === paymentId ? { ...o, status: "paid" } : o))
        if (selectedOffer && selectedOffer.payment_id === paymentId) {
          setSelectedOffer({ ...selectedOffer, status: "paid" })
        }
        setSuccessMessage(`Payment ${offer.invoice_number} approved successfully`)
        setTimeout(() => setSuccessMessage(""), 5000)
      } else {
        setError("Failed to approve payment. Please try again.")
        setTimeout(() => setError(""), 5000)
      }
    } catch (error) {
      console.error("Failed to approve payment:", error)
      setError("Network error. Please check your connection.")
      setTimeout(() => setError(""), 5000)
    } finally {
      setProcessingId(null)
    }
  }

  // Handle viewing payment details
  const handleViewDetails = async (offer: PaymentOffer) => {
    setSelectedOffer(offer)
    setShowDetailsDialog(true)
  }

  // Sort functionality
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Filter and sort offers
  const filteredAndSortedOffers = useMemo(() => {
    let filtered = offers.filter((offer) => {
      const matchesSearch =
        searchTerm === "" ||
        offer.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.vendor_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.buyer.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || offer.status === statusFilter

      return matchesSearch && matchesStatus
    })

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key]
        const bValue = (b as any)[sortConfig.key]
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [offers, searchTerm, statusFilter, sortConfig])

  // Calculate statistics
  const stats = useMemo(() => ({
    total: filteredAndSortedOffers.length,
    totalAmount: filteredAndSortedOffers.reduce((sum, offer) => sum + offer.amount, 0),
    totalFees: filteredAndSortedOffers.reduce((sum, offer) => sum + offer.fee_amount, 0),
    pending: filteredAndSortedOffers.filter(o => o.status === "pending").length,
    paid: filteredAndSortedOffers.filter(o => o.status === "paid").length,
  }), [filteredAndSortedOffers])

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PaymentStatsCard
            title="Total Requests"
            value={stats.total}
            icon={DollarSign}
            color="blue"
            trend={{ value: 12.5, isPositive: true }}
            loading={isLoading}
          />
          <PaymentStatsCard
            title="Total Value"
            value={formatCurrency(stats.totalAmount)}
            icon={Building}
            color="green"
            trend={{ value: 8.3, isPositive: true }}
            loading={isLoading}
          />
          <PaymentStatsCard
            title="Total Fees"
            value={formatCurrency(stats.totalFees)}
            icon={Clock}
            color="amber"
            trend={{ value: 3.2, isPositive: false }}
            loading={isLoading}
          />
          <PaymentStatsCard
            title="Pending Approval"
            value={stats.pending}
            icon={CheckCircle}
            color="purple"
            trend={{ value: 18.7, isPositive: true }}
            loading={isLoading}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices, vendors, suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
              aria-label="Search payments"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10" aria-label="Filter by status">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={fetchOffers} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            aria-label="Refresh payment queue"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Table */}
        {filteredAndSortedOffers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead 
                      onClick={() => handleSort('invoice_number')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Invoice {sortConfig?.key === 'invoice_number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead 
                      onClick={() => handleSort('amount')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Amount {sortConfig?.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Banking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead 
                      onClick={() => handleSort('created_at')}
                      className="cursor-pointer hover:text-foreground transition-colors"
                    >
                      Created {sortConfig?.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedOffers.map((offer) => (
                    <TableRow 
                      key={offer.payment_id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                      onClick={() => handleViewDetails(offer)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            {offer.invoice_number}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Vendor: {offer.vendor_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[180px]" title={offer.supplier_company_name || offer.supplier}>
                            {offer.supplier_company_name || offer.supplier}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-bold text-green-400">{formatCurrency(offer.amount)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Net: {formatCurrency(offer.offered_amount)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{offer.fee_percent}%</div>
                          <div className="text-xs text-red-400 mt-1">
                            -{formatCurrency(offer.fee_amount)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getBankingStatus(offer.banking_details)}</TableCell>
                      <TableCell>{getStatusBadge(offer.status)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(offer.created_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{new Date(offer.created_at).toLocaleString()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell 
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-2 justify-end">
                          {offer.status === "pending" && (
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(offer)}
                              disabled={processingId === offer.payment_id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              aria-label={`Approve payment ${offer.invoice_number}`}
                            >
                              {processingId === offer.payment_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-white/10"
                                aria-label="More actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem 
                                onClick={() => handleViewDetails(offer)}
                                className="hover:bg-white/10 cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                                <Download className="mr-2 h-4 w-4" />
                                Export Data
                              </DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Details Dialog */}
        {selectedOffer && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Payment Details
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Complete information about payment request #{selectedOffer.invoice_number}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-sm font-medium text-muted-foreground">Current Status</span>
                  {getStatusBadge(selectedOffer.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Invoice Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Invoice Information
                    </h3>
                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                      <InfoRow label="Invoice Number" value={selectedOffer.invoice_number} icon={Hash} />
                      <InfoRow label="Vendor Number" value={selectedOffer.vendor_number} icon={Hash} />
                      <InfoRow label="Due Date" value={formatDate(selectedOffer.due_date || "")} icon={Calendar} />
                    </div>
                  </div>

                  {/* Parties Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      Parties
                    </h3>
                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                      <InfoRow label="Supplier" value={selectedOffer.supplier} icon={Building} />
                      <InfoRow label="Buyer" value={selectedOffer.buyer} icon={User} />
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Payment Breakdown
                    </h3>
                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                      <InfoRow 
                        label="Original Amount" 
                        value={formatCurrency(selectedOffer.amount)} 
                        valueClass="text-green-400 font-bold"
                      />
                      <InfoRow 
                        label={`Fee (${selectedOffer.fee_percent}%)`} 
                        value={`-${formatCurrency(selectedOffer.fee_amount)}`}
                        valueClass="text-red-400"
                      />
                      <Separator className="bg-white/10" />
                      <InfoRow 
                        label="Net Amount" 
                        value={formatCurrency(selectedOffer.offered_amount)}
                        valueClass="text-blue-400 font-bold text-lg"
                      />
                    </div>
                  </div>

                  {/* Banking Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-amber-500" />
                      Banking Details
                    </h3>
                    {selectedOffer.banking_details.bank_name ? (
                      <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                        <InfoRow label="Bank" value={selectedOffer.banking_details.bank_name} />
                        <InfoRow label="Account Holder" value={selectedOffer.banking_details.account_holder_name ?? ""} />
                        <InfoRow 
                          label="Account" 
                          value={`***${selectedOffer.banking_details.account_number?.slice(-4)}`}
                          valueClass="font-mono"
                        />
                        <div className="pt-2">
                          {getBankingStatus(selectedOffer.banking_details)}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                        <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No banking details available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                  {selectedOffer.status === "pending" && (
                    <Button 
                      onClick={() => handleApprove(selectedOffer)}
                      disabled={processingId === selectedOffer.payment_id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingId === selectedOffer.payment_id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Payment
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDetailsDialog(false)}
                    className="border-white/20 hover:bg-white/10"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}

// Info Row Component
interface InfoRowProps {
  label: string;
  value: string;
  icon?: React.ElementType;
  valueClass?: string;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon: Icon, valueClass = "" }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3" />}
      {label}:
    </span>
    <span className={`font-medium text-right ${valueClass}`}>{value}</span>
  </div>
)

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
      <Skeleton className="h-10 w-full mb-4" />
      <Skeleton className="h-10 w-full mb-4" />
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
)

// Empty State Component
const EmptyState = () => (
  <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
    <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
    <h3 className="text-xl font-semibold mb-2">No payments found</h3>
    <p className="text-muted-foreground max-w-md mx-auto">
      No payment requests match your current filters. Try adjusting your search criteria or clearing filters.
    </p>
  </div>
)