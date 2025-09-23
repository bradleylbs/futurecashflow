"use client"

import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTitle, DialogContent } from "@/components/ui/dialog"

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
  bankDetails: string
  status: "accepted" | "approved" | "executed" | "failed"
  createdAt: string
  acceptedAt?: string
}

export default function AdminPaymentQueue() {
  const [offers, setOffers] = useState<PaymentOffer[]>([])
  const [filter, setFilter] = useState({ buyer: "", supplier: "", date: "" })
  const [selectedOffer, setSelectedOffer] = useState<PaymentOffer | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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
        bankDetails: o.bank_details,
        status: o.status,
        createdAt: o.created_at,
        acceptedAt: o.accepted_at
      })) : []))
      .catch(() => setOffers([]))
  }, [])

  const handleApprove = async (offer: PaymentOffer) => {
    await fetch("/api/payments/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: offer.id })
    })
    setSelectedOffer({ ...offer, status: "approved" })
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "approved" } : o))
  }

  const handleExecute = async (offer: PaymentOffer) => {
    await fetch("/api/payments/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: offer.id })
    })
    setSelectedOffer({ ...offer, status: "executed" })
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "executed" } : o))
    setDialogOpen(false)
  }

  const filteredOffers = offers.filter(o =>
    (!filter.buyer || o.buyer === filter.buyer) &&
    (!filter.supplier || o.supplier === filter.supplier) &&
    (!filter.date || o.createdAt?.slice(0,10) === filter.date)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Queue</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Filter by Buyer"
            value={filter.buyer}
            onChange={e => setFilter(f => ({ ...f, buyer: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <input
            type="text"
            placeholder="Filter by Supplier"
            value={filter.supplier}
            onChange={e => setFilter(f => ({ ...f, supplier: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <input
            type="date"
            value={filter.date}
            onChange={e => setFilter(f => ({ ...f, date: e.target.value }))}
            className="border rounded px-2 py-1"
          />
        </div>
        {/* Payment Table */}
        <Table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Buyer</th>
              <th>Invoice</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Offered</th>
              <th>Fee %</th>
              <th>Fee Amt</th>
              <th>Status</th>
              <th>Accepted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOffers.map(offer => (
              <tr key={offer.id}>
                <td>{offer.supplier}</td>
                <td>{offer.buyer}</td>
                <td>{offer.invoiceNumber}</td>
                <td>{offer.vendorNumber}</td>
                <td>{offer.amount.toLocaleString()}</td>
                <td>{offer.offeredAmount.toLocaleString()}</td>
                <td>{offer.feePercent}</td>
                <td>{offer.feeAmount.toLocaleString()}</td>
                <td><Badge>{offer.status}</Badge></td>
                <td>{offer.acceptedAt ? offer.acceptedAt.slice(0,10) : ""}</td>
                <td>
                  <Button size="sm" onClick={() => { setSelectedOffer(offer); setDialogOpen(true) }}>
                    Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {/* Approve/Execute Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogContent>
            {selectedOffer && (
              <div className="space-y-2">
                <div><strong>Supplier:</strong> {selectedOffer.supplier}</div>
                <div><strong>Buyer:</strong> {selectedOffer.buyer}</div>
                <div><strong>Invoice:</strong> {selectedOffer.invoiceNumber}</div>
                <div><strong>Vendor Number:</strong> {selectedOffer.vendorNumber}</div>
                <div><strong>Amount:</strong> {selectedOffer.amount.toLocaleString()}</div>
                <div><strong>Offered Amount:</strong> {selectedOffer.offeredAmount.toLocaleString()}</div>
                <div><strong>Fee Percent:</strong> {selectedOffer.feePercent}</div>
                <div><strong>Fee Amount:</strong> {selectedOffer.feeAmount.toLocaleString()}</div>
                <div><strong>Bank Details:</strong> {selectedOffer.bankDetails}</div>
                <div><strong>Status:</strong> <Badge>{selectedOffer.status}</Badge></div>
                <div><strong>Accepted At:</strong> {selectedOffer.acceptedAt ? selectedOffer.acceptedAt.slice(0,10) : ""}</div>
              </div>
            )}
          </DialogContent>
          <div className="flex gap-2 justify-end mt-4">
              {selectedOffer && selectedOffer.status === "accepted" && (
                <Button onClick={() => handleApprove(selectedOffer)}>Approve</Button>
              )}
              {selectedOffer && selectedOffer.status === "approved" && (
                <Button onClick={() => handleExecute(selectedOffer)}>Execute</Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
          </div>
        </Dialog>
      </CardContent>
    </Card>
  )
}
