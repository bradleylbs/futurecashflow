"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"

interface InvoiceRow {
  id: string
  invoice_number: string
  vendor_number: string
  amount: number
  due_date: string
  status: string
  buyer_email?: string
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [source, setSource] = useState<"buyer" | "supplier" | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError("")
        // Try buyer first, fallback to supplier
        let res = await fetch("/api/buyer/invoices", { credentials: "include" })
        if (res.ok) {
          setSource("buyer")
        } else if (res.status === 403 || res.status === 401) {
          const sup = await fetch("/api/supplier/invoices", { credentials: "include" })
          res = sup
          if (sup.ok) setSource("supplier")
        }
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setInvoices(Array.isArray(data?.invoices) ? data.invoices : [])
      } catch (e) {
        console.error("Invoices page fetch error:", e)
        setError("Failed to load invoices")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:text-foreground focus:border focus:border-border focus:px-3 focus:py-2 focus:rounded-md shadow-sm"
      >
        Skip to main content
      </a>

      <main id="main-content" className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Invoice Management</h1>
          <p className="text-muted-foreground">Manage your invoices and payments</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center text-gray-600"><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : invoices.length === 0 ? (
            <div className="space-y-2 text-gray-600">
              <p className="font-medium">No invoices found.</p>
              {source === "buyer" && (
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Only invoices with status <span className="font-semibold">accepted</span> are shown.</li>
                  <li>Upload AP data via your integration or the upload API at <code className="bg-muted px-1 rounded">POST /api/buyer/invoices/upload</code>.</li>
                  <li>Ensure your vendor numbers are correct; invalid rows are stored as rejected and won’t appear here.</li>
                </ul>
              )}
              {source === "supplier" && (
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>You’ll see invoices only where your buyer has consented your <span className="font-semibold">vendor_number</span>.</li>
                  <li>Ask the buyer to add your vendor number under Suppliers or via the consent API, then upload AP invoices.</li>
                  <li>Only invoices with status <span className="font-semibold">accepted</span> are shown.</li>
                </ul>
              )}
              {!source && (
                <p className="text-sm">Please sign in and try again.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Invoice #</th>
                    <th className="py-2 pr-4">Vendor</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Due Date</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.invoice_number}</td>
                      <td className="py-2 pr-4">{row.vendor_number}</td>
                      <td className="py-2 pr-4">R {Number(row.amount).toFixed(2)}</td>
                      <td className="py-2 pr-4">{new Date(row.due_date).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <a href="/dashboard/supplier" className="inline-flex items-center rounded-md border px-3 py-2 text-sm">Back to Dashboard</a>
          </div>
        </div>
      </main>
    </div>
  )
}
