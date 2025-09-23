"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
} from "lucide-react"

interface PaymentOffer {
  id: string
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
  status: "accepted" | "approved" | "executed" | "failed"
  created_at: string
  accepted_at?: string
  due_date?: string
}

interface AdminPaymentQueueProps {
  refreshTrigger?: number
  tabActive?: boolean
}

export function AdminPaymentQueue({ refreshTrigger, tabActive }: AdminPaymentQueueProps) {
  const [offers, setOffers] = useState<PaymentOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOffer, setSelectedOffer] = useState<PaymentOffer | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsRefreshing, setDetailsRefreshing] = useState(false)
  // Reset dialog/modal state when tabActive becomes false
  useEffect(() => {
    if (typeof tabActive !== "undefined" && !tabActive) {
      setShowDetailsDialog(false)
      setSelectedOffer(null)
    }
  }, [tabActive])

  const fetchOffers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/payments/queue", { credentials: "include" })

      if (!response.ok) {
        const msg = await response.text().catch(() => "")
        throw new Error(`Failed to fetch payment queue (${response.status}) ${msg}`)
      }

      const data = await response.json()
      const mappedOffers = Array.isArray(data) ? data.map((o: any) => ({
        id: o.id,
        supplier: o.supplier,
        supplier_company_name: o.supplier_company_name,
        buyer: o.buyer,
        invoice_number: o.invoice_number,
        vendor_number: o.vendor_number,
        amount: Number(o.amount),
        offered_amount: Number(o.offered_amount),
        fee_percent: Number(o.fee_percent),
        fee_amount: Number(o.fee_amount),
        banking_details: o.banking_details || {},
        status: o.status,
        created_at: o.created_at,
        accepted_at: o.accepted_at,
        due_date: o.due_date
      })) : []
      setOffers(mappedOffers)
      setError("")
    } catch (error) {
      setError("Failed to load payment queue")
      console.error("Fetch payment queue error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [refreshTrigger])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      accepted: { variant: "secondary" as const, icon: Clock, label: "Accepted", bgClass: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200" },
      approved: { variant: "default" as const, icon: CheckCircle, label: "Approved", bgClass: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200" },
      executed: { variant: "outline" as const, icon: PlayCircle, label: "Executed", bgClass: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200" },
      failed: { variant: "destructive" as const, icon: XCircle, label: "Failed", bgClass: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.accepted
    const Icon = config.icon

    return (
      <Badge className={`flex items-center gap-2 shadow-sm ${config.bgClass}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available"
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getBankingStatus = (bankingDetails: PaymentOffer['banking_details']) => {
    if (!bankingDetails.bank_name || !bankingDetails.account_number) {
      return (
        <Badge className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200 shadow-sm">
          <CreditCard className="h-3 w-3" />
          Not Provided
        </Badge>
      )
    }
    
    if (bankingDetails.status === 'verified') {
      return (
        <Badge className="flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 shadow-sm">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      )
    }

    return (
      <Badge className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200 shadow-sm">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    )
  }

  const handleApprove = async (offer: PaymentOffer) => {
    try {
      const response = await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offer.id })
      })
      
      if (response.ok) {
        setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "approved" } : o))
        if (selectedOffer && selectedOffer.id === offer.id) {
          setSelectedOffer({ ...selectedOffer, status: "approved" })
        }
      } else {
        setError("Failed to approve payment")
      }
    } catch (error) {
      console.error("Failed to approve payment:", error)
      setError("Failed to approve payment")
    }
  }

  const handleExecute = async (offer: PaymentOffer) => {
    try {
      const response = await fetch("/api/payments/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offer.id })
      })
      
      if (response.ok) {
        setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "executed" } : o))
        if (selectedOffer && selectedOffer.id === offer.id) {
          setSelectedOffer({ ...selectedOffer, status: "executed" })
        }
      } else {
        setError("Failed to execute payment")
      }
    } catch (error) {
      console.error("Failed to execute payment:", error)
      setError("Failed to execute payment")
    }
  }

  const handleViewDetails = async (offer: PaymentOffer) => {
    setSelectedOffer(offer)
    setShowDetailsDialog(true)
  }

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      searchTerm === "" ||
      offer.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.vendor_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.buyer.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || offer.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: filteredOffers.length,
    totalAmount: filteredOffers.reduce((sum, offer) => sum + offer.amount, 0),
    totalFees: filteredOffers.reduce((sum, offer) => sum + offer.fee_amount, 0),
    pending: filteredOffers.filter(o => o.status === "accepted").length,
    approved: filteredOffers.filter(o => o.status === "approved").length,
    executed: filteredOffers.filter(o => o.status === "executed").length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Loading payment queue...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur border-0 shadow-lg rounded-xl">
          <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Requests</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-blue-200 p-2 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Value</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="bg-green-200 p-2 rounded-lg">
              <Building className="h-5 w-5 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-600 text-sm font-medium">Total Fees</p>
              <p className="text-2xl font-bold text-amber-900">{formatCurrency(stats.totalFees)}</p>
            </div>
            <div className="bg-amber-200 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Processed</p>
              <p className="text-2xl font-bold text-purple-900">{stats.executed}</p>
            </div>
            <div className="bg-purple-200 p-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-6 bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
        <Input
          placeholder="Search by invoice, vendor, supplier or buyer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm border-0 bg-white/70 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/90 transition-all duration-300 placeholder:text-gray-500"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-0 bg-white/70 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/90 transition-all duration-300">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="executed">Executed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={fetchOffers} 
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Payment Queue Table */}
      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
          <DollarSign className="h-16 w-16 text-blue-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-3">
            No payments found
          </h3>
          <p className="text-gray-600">No payment requests match your current filters.</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Banking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOffers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{offer.invoice_number}</div>
                      <div className="text-sm text-gray-600">{offer.vendor_number}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm truncate max-w-[180px]" title={offer.supplier_company_name || offer.supplier}>
                      {offer.supplier_company_name || offer.supplier}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-bold text-green-600">{formatCurrency(offer.amount)}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(offer.offered_amount)} net</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{offer.fee_percent}%</div>
                      <div className="text-xs text-red-600">{formatCurrency(offer.fee_amount)}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getBankingStatus(offer.banking_details)}</TableCell>
                  <TableCell>{getStatusBadge(offer.status)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(offer.accepted_at || offer.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {offer.status === "accepted" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(offer)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                        >
                          Approve
                        </Button>
                      )}
                      {offer.status === "approved" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleExecute(offer)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-7"
                        >
                          Execute
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-xl">
                          <DropdownMenuItem onClick={() => handleViewDetails(offer)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Details Dialog */}
      {selectedOffer && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="bg-white/95 backdrop-blur-lg max-h-[calc(100vh-2rem)] overflow-y-auto border-0 shadow-2xl rounded-3xl sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                Payment Details
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Complete information about the early payment request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Invoice Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Invoice Number:</span>
                        <span className="font-medium">{selectedOffer.invoice_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Vendor Number:</span>
                        <span className="font-medium">{selectedOffer.vendor_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Due Date:</span>
                        <span className="font-medium">{formatDate(selectedOffer.due_date || "")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Status:</span>
                        <div>{getStatusBadge(selectedOffer.status)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Parties</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Supplier:</span>
                        <span className="font-medium text-right max-w-[200px] truncate" title={selectedOffer.supplier}>
                          {selectedOffer.supplier}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Buyer:</span>
                        <span className="font-medium text-right max-w-[200px] truncate" title={selectedOffer.buyer}>
                          {selectedOffer.buyer}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Payment Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Original Amount:</span>
                        <span className="font-bold text-green-600">{formatCurrency(selectedOffer.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Fee ({selectedOffer.fee_percent}%):</span>
                        <span className="font-medium text-red-600">-{formatCurrency(selectedOffer.fee_amount)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Net Amount:</span>
                        <span className="font-bold text-blue-600">{formatCurrency(selectedOffer.offered_amount)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Banking Details</h3>
                    {selectedOffer.banking_details.bank_name ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Bank:</span>
                          <span className="font-medium">{selectedOffer.banking_details.bank_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Account Holder:</span>
                          <span className="font-medium">{selectedOffer.banking_details.account_holder_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Account:</span>
                          <span className="font-mono text-sm">***{selectedOffer.banking_details.account_number?.slice(-4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Status:</span>
                          <div>{getBankingStatus(selectedOffer.banking_details)}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No banking details available</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-3 justify-end">
                  {selectedOffer.status === "accepted" && (
                    <Button 
                      onClick={() => handleApprove(selectedOffer)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Payment
                    </Button>
                  )}
                  {selectedOffer.status === "approved" && (
                    <Button 
                      onClick={() => handleExecute(selectedOffer)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Execute Payment
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDetailsDialog(false)}
                    className="border-gray-200"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}