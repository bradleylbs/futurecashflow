"use client"

import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Filter, Search, Calendar, DollarSign, Eye, CheckCircle, PlayCircle, AlertCircle } from "lucide-react"

interface PaymentOffer {
  id: string
  supplier: string
  buyer: string
  invoiceNumber: string
  vendorNumber: string
  amount: number
  offeredAmount: number
  feePercent: number
  feeAmount: number
  banking_details: {
    bank_name?: string
    account_holder_name?: string
    account_number?: string
    routing_number?: string
    status?: string
  }
  status: "accepted" | "approved" | "executed" | "failed"
  createdAt: string
  acceptedAt?: string
}

const statusConfig = {
  accepted: { color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  executed: { color: "bg-gray-100 text-gray-800", icon: PlayCircle },
  failed: { color: "bg-red-100 text-red-800", icon: AlertCircle }
}

export default function AdminPaymentQueue() {
  const [offers, setOffers] = useState<PaymentOffer[]>([])
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null)
  const [filter, setFilter] = useState({ buyer: "", supplier: "", date: "", status: "" })
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    fetch("/api/payments/queue")
      .then(res => res.json())
      .then(data => setOffers(Array.isArray(data) ? data.map((o: any) => ({
        id: o.id,
        supplier: o.supplier,
        buyer: o.buyer,
        invoiceNumber: o.invoice_number,
        vendorNumber: o.vendor_number,
        amount: Number(o.amount),
        offeredAmount: Number(o.offered_amount),
        feePercent: Number(o.fee_percent),
        feeAmount: Number(o.fee_amount),
        banking_details: o.banking_details || {},
        status: o.status,
        createdAt: o.created_at,
        acceptedAt: o.accepted_at
      })) : []))
      .catch(() => setOffers([]))
  }, [])

  const handleApprove = async (offer: PaymentOffer) => {
    try {
      await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offer.id })
      })
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "approved" } : o))
    } catch (error) {
      console.error("Failed to approve payment:", error)
    }
  }

  const handleExecute = async (offer: PaymentOffer) => {
    try {
      await fetch("/api/payments/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offer.id })
      })
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "executed" } : o))
    } catch (error) {
      console.error("Failed to execute payment:", error)
    }
  }

  const toggleExpand = (offerId: string) => {
    setExpandedOffer(expandedOffer === offerId ? null : offerId)
  }

  const filteredOffers = offers.filter(o =>
    (!filter.buyer || o.buyer.toLowerCase().includes(filter.buyer.toLowerCase())) &&
    (!filter.supplier || o.supplier.toLowerCase().includes(filter.supplier.toLowerCase())) &&
    (!filter.date || o.createdAt?.slice(0,10) === filter.date) &&
    (!filter.status || o.status === filter.status)
  )

  const totalAmount = filteredOffers.reduce((sum, offer) => sum + offer.amount, 0)
  const totalFees = filteredOffers.reduce((sum, offer) => sum + offer.feeAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Queue</h1>
          <p className="text-muted-foreground">Manage and process early payment offers</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white rounded-lg border p-4 text-center min-w-[120px]">
            <div className="text-2xl font-bold text-blue-600">{filteredOffers.length}</div>
            <div className="text-sm text-muted-foreground">Total Offers</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center min-w-[140px]">
            <div className="text-2xl font-bold text-green-600">${totalAmount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Amount</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center min-w-[120px]">
            <div className="text-2xl font-bold text-orange-600">${totalFees.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Fees</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {isFilterOpen && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search buyer..."
                  value={filter.buyer}
                  onChange={e => setFilter(f => ({ ...f, buyer: e.target.value }))}
                  className="pl-9 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search supplier..."
                  value={filter.supplier}
                  onChange={e => setFilter(f => ({ ...f, supplier: e.target.value }))}
                  className="pl-9 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={filter.date}
                  onChange={e => setFilter(f => ({ ...f, date: e.target.value }))}
                  className="pl-9 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label htmlFor="status-filter" className="sr-only">Status</label>
              <select
                id="status-filter"
                aria-label="Status"
                value={filter.status}
                onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="accepted">Accepted</option>
                <option value="approved">Approved</option>
                <option value="executed">Executed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            {(filter.buyer || filter.supplier || filter.date || filter.status) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setFilter({ buyer: "", supplier: "", date: "", status: "" })}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Payment Cards */}
      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No payments found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredOffers.map(offer => {
            const StatusIcon = statusConfig[offer.status].icon
            const isExpanded = expandedOffer === offer.id
            
            return (
              <Card key={offer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {/* Main Row */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-1">
                        <div className="md:col-span-2">
                          <div className="font-medium text-sm text-muted-foreground mb-1">Invoice</div>
                          <div className="font-semibold">{offer.invoiceNumber}</div>
                          <div className="text-sm text-muted-foreground">{offer.vendorNumber}</div>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-muted-foreground mb-1">Supplier</div>
                          <div className="font-medium truncate" title={offer.supplier}>{offer.supplier}</div>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-muted-foreground mb-1">Amount</div>
                          <div className="font-bold text-green-600">${offer.amount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">${offer.offeredAmount.toLocaleString()} net</div>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-muted-foreground mb-1">Fee</div>
                          <div className="font-medium">{offer.feePercent}%</div>
                          <div className="text-sm text-muted-foreground">${offer.feeAmount.toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-start">
                          <div className="font-medium text-sm text-muted-foreground mb-1">Status</div>
                          <Badge className={`${statusConfig[offer.status].color} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {offer.status === "accepted" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(offer)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {offer.status === "approved" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleExecute(offer)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Execute
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleExpand(offer.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {isExpanded ? 'Less' : 'Details'}
                          {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 text-gray-900">Payment Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Original Amount:</span>
                              <span className="font-medium">${offer.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fee ({offer.feePercent}%):</span>
                              <span className="font-medium text-red-600">-${offer.feeAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="font-medium">Net Amount:</span>
                              <span className="font-bold text-green-600">${offer.offeredAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Accepted:</span>
                              <span className="font-medium">
                                {offer.acceptedAt ? new Date(offer.acceptedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-3 text-gray-900">Parties</h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-muted-foreground block">Buyer:</span>
                              <span className="font-medium">{offer.buyer}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Supplier:</span>
                              <span className="font-medium">{offer.supplier}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Vendor Number:</span>
                              <span className="font-medium">{offer.vendorNumber}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3 text-gray-900">Banking Details</h4>
                          <div className="space-y-2 text-sm">
                            {offer.banking_details.bank_name ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Bank:</span>
                                  <span className="font-medium">{offer.banking_details.bank_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Account Holder:</span>
                                  <span className="font-medium">{offer.banking_details.account_holder_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Account:</span>
                                  <span className="font-mono">***{offer.banking_details.account_number?.slice(-4)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge variant={offer.banking_details.status === 'verified' ? 'default' : 'secondary'}>
                                    {offer.banking_details.status}
                                  </Badge>
                                </div>
                              </>
                            ) : (
                              <div className="text-muted-foreground italic">No banking details available</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}