"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, CircleSlash2, AlertCircle, RefreshCw, CreditCard, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface BankingRow {
  banking_id: string
  user_id: string
  email: string
  company_name?: string
  bank_name: string
  account_holder_name: string
  account_number_masked?: string
  routing_number_masked?: string
  status: string
  submission_date: string
  verification_date?: string
  verification_notes?: string
}

export function AdminBankingTable() {
  const [rows, setRows] = useState<BankingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selected, setSelected] = useState<BankingRow | null>(null)
  const [details, setDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState("")

  const fetchRows = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      const res = await fetch(`/api/admin/banking?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch banking submissions")
      const data = await res.json()
      setRows(data.banking || [])
      setError("")
    } catch (e) {
      console.error(e)
      setError("Failed to load banking submissions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [statusFilter])

  const action = async (banking_id: string, decision: "verify" | "reject" | "resubmission_required") => {
    const res = await fetch(`/api/admin/banking/${banking_id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes: decisionNotes || undefined }),
    })
    if (res.ok) {
      setDecisionNotes("")
      setSelected(null)
      setDetails(null)
      fetchRows()
    } else {
      try {
        const data = await res.json()
        setError(data?.error || "Failed to update banking verification")
      } catch {
        setError("Failed to update banking verification")
      }
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; bgClass: string }> = {
      pending: { 
        label: "Pending", 
  bgClass: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 shadow-sm" 
      },
      verified: { 
        label: "Verified", 
  bgClass: "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 shadow-sm" 
      },
      rejected: { 
        label: "Rejected", 
        bgClass: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200 shadow-sm" 
      },
      resubmission_required: { 
        label: "Resubmission Required", 
  bgClass: "bg-gradient-to-r from-indigo-100 to-blue-100 text-blue-800 border-blue-200 shadow-sm" 
      },
    }
    const cfg = map[status] || map.pending
    return <Badge className={`flex items-center gap-1 ${cfg.bgClass}`}>{cfg.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg">
  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Loading banking submissions...
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

      <div className="flex flex-col sm:flex-row gap-4 p-6 bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] border-0 bg-white/70 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/90 transition-all duration-300">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-xl">
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="resubmission_required">Resubmission Required</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={fetchRows} 
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
          <CreditCard className="h-16 w-16 text-blue-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-3">
            No banking submissions found
          </h3>
          <p className="text-gray-600">No banking submissions match your current filters.</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200/50">
              <TableHead className="font-semibold text-gray-700">Company</TableHead>
              <TableHead className="font-semibold text-gray-700">Bank</TableHead>
              <TableHead className="font-semibold text-gray-700">Account Holder</TableHead>
              <TableHead className="font-semibold text-gray-700">Account</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-gray-700">Submitted</TableHead>
              <TableHead className="w-[180px] font-semibold text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.banking_id} className="hover:bg-white/50 transition-colors duration-200">
                <TableCell>
                  <div className="font-semibold text-gray-900">{r.company_name || "Unknown"}</div>
                  <div className="text-sm text-gray-600">{r.email}</div>
                </TableCell>
                <TableCell className="font-medium text-gray-800">{r.bank_name}</TableCell>
                <TableCell className="font-medium text-gray-800">{r.account_holder_name}</TableCell>
                <TableCell className="font-medium text-gray-800">
                  <div className="text-sm text-gray-700">
                    {r.account_number_masked ? `Acct: ${r.account_number_masked}` : "Acct: ••••"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.routing_number_masked ? `Route: ${r.routing_number_masked}` : "Route: ••••"}
                  </div>
                </TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-sm text-gray-600">{new Date(r.submission_date).toLocaleString()}</TableCell>
                <TableCell className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={async () => {
                      setSelected(r)
                      setDetails(null)
                      setDetailsLoading(true)
                      try {
                        const res = await fetch(`/api/admin/banking/${r.banking_id}`)
                        if (res.ok) {
                          const data = await res.json()
                          setDetails(data.banking)
                        } else {
                          try {
                            const data = await res.json()
                            setError(data?.error || "Failed to load banking details")
                          } catch {
                            setError("Failed to load banking details")
                          }
                        }
                      } finally {
                        setDetailsLoading(false)
                      }
                    }}
                    className="bg-white/70 backdrop-blur-sm border-0 shadow-md hover:bg-white/90 hover:scale-105 transition-all duration-300 text-gray-700 font-medium px-3 py-2 rounded-lg"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => action(r.banking_id, "verify")}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> 
                    Verify
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => action(r.banking_id, "reject")}
                    className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <CircleSlash2 className="mr-1 h-3 w-3" /> 
                    Reject
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => action(r.banking_id, "resubmission_required")}
                    className="bg-white/70 backdrop-blur-sm border-0 shadow-md hover:bg-white/90 hover:scale-105 transition-all duration-300 text-gray-700 font-medium px-3 py-2 rounded-lg"
                  >
                    <AlertCircle className="mr-1 h-3 w-3" /> 
                    Resubmit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setDetails(null); setDecisionNotes("") } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Banking Details</DialogTitle>
            <DialogDescription>Full details are decrypted on demand for review.</DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex items-center gap-2 text-gray-600"><RefreshCw className="h-4 w-4 animate-spin text-blue-600"/> Loading…</div>
          ) : details ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-500">Bank</div>
                <div className="col-span-2 font-medium">{details.bank_name}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-500">Account Holder</div>
                <div className="col-span-2 font-medium">{details.account_holder_name}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-500">Account Number</div>
                <div className="col-span-2 font-mono">{details.account_number_full || "Unavailable"}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-500">Routing Number</div>
                <div className="col-span-2 font-mono">{details.routing_number_full || "Unavailable"}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-500">Status</div>
                <div className="col-span-2">{statusBadge(details.status)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-500">Submitted</div>
                <div className="col-span-2">{new Date(details.submission_date).toLocaleString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} className="w-full min-h-20 rounded-md border border-gray-200 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Add verification notes…" />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No details available.</div>
          )}
          <DialogFooter className="justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setSelected(null); setDetails(null); setDecisionNotes("") }}>Close</Button>
            </div>
            {selected && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => action(selected.banking_id, "resubmission_required")}
                  className="bg-white/70 backdrop-blur-sm border-0 shadow-md hover:bg-white/90 transition-all duration-300 text-gray-700 font-medium px-3 py-2 rounded-lg"
                >
                  <AlertCircle className="mr-1 h-3 w-3" /> Resubmit
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => action(selected.banking_id, "reject")}
                  className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <CircleSlash2 className="mr-1 h-3 w-3" /> Reject
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => action(selected.banking_id, "verify")}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
