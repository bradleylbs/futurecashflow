"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart, FileText, CreditCard, Zap, MessageCircle, CheckCircle } from "lucide-react"

export default function SupplierAnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const resp = await fetch("/api/supplier/analytics", { credentials: "include" })
      if (!resp.ok) throw new Error("Failed to fetch analytics")
      const data = await resp.json()
      setMetrics(data)
      setError("")
    } catch (error) {
      setError("Failed to load analytics")
      console.error("Fetch analytics error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Supplier Analytics</h2>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
          <CardDescription>Overview of your activity and progress on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#3594f7]/10">
                <FileText className="h-6 w-6 text-[#3594f7]" />
                <div>
                  <div className="text-lg font-bold">{metrics.totalInvoices}</div>
                  <div className="text-xs text-[#b8b6b4]">Total Invoices</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#3594f7]/10">
                <CreditCard className="h-6 w-6 text-[#3594f7]" />
                <div>
                  <div className="text-lg font-bold">{metrics.totalPayments}</div>
                  <div className="text-xs text-[#b8b6b4]">Payments Received</div>
                  <div className="text-xs text-[#b8b6b4]">Total Paid: R{metrics.totalPaid}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#3594f7]/10">
                <Zap className="h-6 w-6 text-[#3594f7]" />
                <div>
                  <div className="text-lg font-bold">{metrics.totalOffers}</div>
                  <div className="text-xs text-[#b8b6b4]">Early Payment Offers</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#3594f7]/10">
                <MessageCircle className="h-6 w-6 text-[#3594f7]" />
                <div>
                  <div className="text-lg font-bold">{metrics.totalTickets}</div>
                  <div className="text-xs text-[#b8b6b4]">Support Tickets</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#3594f7]/10">
                <CheckCircle className="h-6 w-6 text-[#3594f7]" />
                <div>
                  <div className="text-lg font-bold">{metrics.onboardingLevel.replace("_", " ")}</div>
                  <div className="text-xs text-[#b8b6b4]">Onboarding Progress</div>
                </div>
              </div>
            </div>
          ) : (
            <div>No analytics data found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
