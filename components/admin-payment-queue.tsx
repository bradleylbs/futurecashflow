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
  amount: number
  bankDetails: string
  status: "pending" | "approved" | "executed" | "failed"
  reference: string
  date: string
}

export default function AdminPaymentQueue() {
  const [offers, setOffers] = useState<PaymentOffer[]>([])
  const [filter, setFilter] = useState({ buyer: "", supplier: "", date: "" })
  const [selectedOffer, setSelectedOffer] = useState<PaymentOffer | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    // TODO: Fetch offers from backend API
    // setOffers(response.data)
  }, [])

  const handleApprove = (offer: PaymentOffer) => {
    // TODO: Call backend to approve payment
    setSelectedOffer({ ...offer, status: "approved" })
  }

  const handleExecute = (offer: PaymentOffer) => {
    // TODO: Call backend to execute payment
    setSelectedOffer({ ...offer, status: "executed" })
    setDialogOpen(false)
  }

  const filteredOffers = offers.filter(o =>
    (!filter.buyer || o.buyer === filter.buyer) &&
    (!filter.supplier || o.supplier === filter.supplier) &&
    (!filter.date || o.date === filter.date)
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
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOffers.map(offer => (
              <tr key={offer.id}>
                <td>{offer.supplier}</td>
                <td>{offer.buyer}</td>
                <td>{offer.invoiceNumber}</td>
                <td>{offer.amount.toLocaleString()}</td>
                <td><Badge>{offer.status}</Badge></td>
                <td>{offer.date}</td>
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
                <div><strong>Amount:</strong> {selectedOffer.amount.toLocaleString()}</div>
                <div><strong>Bank Details:</strong> {selectedOffer.bankDetails}</div>
                <div><strong>Reference:</strong> {selectedOffer.reference}</div>
                <div><strong>Status:</strong> <Badge>{selectedOffer.status}</Badge></div>
              </div>
            )}
          </DialogContent>
          <div className="flex gap-2 justify-end mt-4">
              {selectedOffer && selectedOffer.status === "pending" && (
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
