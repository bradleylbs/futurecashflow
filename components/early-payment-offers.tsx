"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type Offer = {
  invoice_row_id: string
  invoice_number: string
  vendor_number: string
  amount: number
  due_date: string
  fee_percent: number
  fee_amount: number
  offered_amount: number
  buyer_id: string
  buyer_email: string
}

export function EarlyPaymentOffers() {
  const [loading, setLoading] = useState(false)
  const [offers, setOffers] = useState<Offer[]>([])
  const [error, setError] = useState<string>("")
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const resp = await fetch("/api/supplier/offers", { credentials: "include" })
      if (!resp.ok) throw new Error("Failed to load offers")
      const data = await resp.json()
      const raw = Array.isArray(data?.offers) ? data.offers : []
      // Coerce numeric fields since they may arrive as strings from MySQL driver
      const normalized: Offer[] = raw.map((o: any) => ({
        invoice_row_id: String(o.invoice_row_id),
        invoice_number: String(o.invoice_number),
        vendor_number: String(o.vendor_number),
        amount: Number(o.amount),
        due_date: String(o.due_date),
        fee_percent: Number(o.fee_percent),
        fee_amount: Number(o.fee_amount),
        offered_amount: Number(o.offered_amount),
        buyer_id: String(o.buyer_id),
        buyer_email: String(o.buyer_email),
      }))
      setOffers(normalized)
    } catch (e: any) {
      setError(e?.message || "Failed to load offers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const act = async (invoice_row_id: string, action: "accept" | "decline") => {
    try {
      const resp = await fetch(`/api/supplier/offers/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_row_id }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.error || `Failed to ${action}`)
      toast({
        title: action === "accept" ? "Offer accepted" : "Offer declined",
        description: action === "accept" ? "We'll notify the buyer and process early payment." : "No problem, you can wait for full payment on due date.",
      })
      setOffers(prev => prev.filter(o => o.invoice_row_id !== invoice_row_id))
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message || "Please try again", variant: "destructive" })
    }
  }

  return (
    <Card className="bg-card border border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Early Payment Offers
          </CardTitle>
          <CardDescription>Invoices eligible for early payment at a transparent fee.</CardDescription>
        </div>
        <Button onClick={load} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {offers.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No eligible offers right now. Offers appear for invoices due in ≥ 48 hours with buyer consent.
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map(o => (
              <div key={o.invoice_row_id} className="flex items-start justify-between rounded-lg border border-border p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Invoice {o.invoice_number}</Badge>
                    <Badge variant="outline">Vendor {o.vendor_number}</Badge>
                    <Badge variant="outline" className="text-blue-300">Buyer {o.buyer_email}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                    <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Value: R{o.amount.toFixed(2)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Due: {new Date(o.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm">
                    Early payment: <span className="text-blue-300 font-medium">R{o.offered_amount.toFixed(2)}</span> 
                    (Fee {o.fee_percent}% = R{o.fee_amount.toFixed(2)})
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => act(o.invoice_row_id, "accept")}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Accept
                  </Button>
                  <Button variant="outline" className="border-border" onClick={() => act(o.invoice_row_id, "decline")}>
                    <XCircle className="mr-2 h-4 w-4" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
