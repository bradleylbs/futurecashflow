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

  useEffect(() => {
    fetchAnalytics()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30">
          <BarChart className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">Track your performance and activity metrics</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-white">Key Metrics</CardTitle>
          <CardDescription className="text-muted-foreground">
            Overview of your activity and progress on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading analytics...</div>
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                <FileText className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-lg font-bold text-white">{metrics.totalInvoices}</div>
                  <div className="text-xs text-muted-foreground">Invoices Assigned to You</div>
                  <div className="text-xs text-muted-foreground">Linked via buyer/vendor consent and accepted status</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                <CreditCard className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-lg font-bold text-white">{metrics.totalPayments}</div>
                  <div className="text-xs text-muted-foreground">Payments Received</div>
                  <div className="text-xs text-muted-foreground">Total Paid: R{metrics.totalPaid}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                <Zap className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-lg font-bold text-white">{metrics.totalOffers}</div>
                  <div className="text-xs text-muted-foreground">Early Payment Offers</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                <MessageCircle className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-lg font-bold text-white">{metrics.totalTickets}</div>
                  <div className="text-xs text-muted-foreground">Support Tickets</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                <CheckCircle className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-lg font-bold text-white">{metrics.onboardingLevel.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">Onboarding Progress</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No analytics data found.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
