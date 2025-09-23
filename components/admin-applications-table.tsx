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
  AlertTriangle,
  Building,
  Users,
  FileText,
} from "lucide-react"
import { AdminDecisionDialog } from "@/components/admin-decision-dialog"

interface Application {
  kyc_id: string
  kyc_status: string
  submitted_at: string
  user_id: string
  email: string
  user_role: string
  company_name: string
  registration_number?: string
  tax_number?: string
  company_email?: string
  company_phone?: string
  company_address?: string
  company_type: string
  invited_company_name?: string
  document_count: number
  verified_documents: number
  rejected_documents: number
  pending_documents: number
}

interface AdminApplicationsTableProps {
  refreshTrigger?: number
}

export function AdminApplicationsTable({ refreshTrigger }: AdminApplicationsTableProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [userTypeFilter, setUserTypeFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showDecisionDialog, setShowDecisionDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [detailsDocs, setDetailsDocs] = useState<Array<{
    document_id: string
    document_type: string
    filename: string
    file_size: number
    document_status: string
    upload_date: string
  }>>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsRefreshing, setDetailsRefreshing] = useState(false)
  const [appRefreshing, setAppRefreshing] = useState(false)

  const fetchApplications = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (userTypeFilter !== "all") params.append("userType", userTypeFilter)

  const response = await fetch(`/api/admin/applications?${params.toString()}` , { credentials: "include" })

      if (!response.ok) {
        const msg = await response.text().catch(() => "")
        throw new Error(`Failed to fetch applications (${response.status}) ${msg}`)
      }

      const data = await response.json()
      setApplications(data.applications || [])
      setError("")
    } catch (error) {
      setError("Failed to load applications")
      console.error("Fetch applications error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [refreshTrigger, statusFilter, userTypeFilter])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Pending", bgClass: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200" },
      under_review: { variant: "outline" as const, icon: AlertTriangle, label: "Under Review", bgClass: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200" },
      ready_for_decision: { variant: "outline" as const, icon: AlertTriangle, label: "Ready for Decision", bgClass: "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200" },
      approved: { variant: "default" as const, icon: CheckCircle, label: "Approved", bgClass: "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200" },
      rejected: { variant: "destructive" as const, icon: XCircle, label: "Rejected", bgClass: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`flex items-center gap-2 shadow-sm ${config.bgClass}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getUserTypeBadge = (role: string) => {
    return (
      <Badge className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200 shadow-sm">
        {role === "supplier" ? <Building className="h-3 w-3" /> : <Users className="h-3 w-3" />}
        {role === "supplier" ? "Supplier" : "Buyer"}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not submitted"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getDocumentProgress = (app: Application) => {
    const total = app.document_count
    const verified = app.verified_documents
    const rejected = app.rejected_documents
    const pending = app.pending_documents

    if (total === 0) return "No documents"

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {verified + rejected}/{total}
        </span>
        {verified > 0 && (
          <Badge className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 shadow-sm">
            {verified} ✓
          </Badge>
        )}
        {rejected > 0 && (
          <Badge className="text-xs bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200 shadow-sm">
            {rejected} ✗
          </Badge>
        )}
        {pending > 0 && (
          <Badge className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 shadow-sm">
            {pending} ⏳
          </Badge>
        )}
      </div>
    )
  }

  const handleMakeDecision = (application: Application) => {
    setSelectedApplication(application)
    setShowDecisionDialog(true)
  }

  const fetchDetailsDocs = async (kycId: string) => {
    try {
      const res = await fetch(`/api/admin/documents?kycId=${encodeURIComponent(kycId)}&limit=100`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setDetailsDocs(Array.isArray(data.documents) ? data.documents : [])
      } else {
        setDetailsDocs([])
      }
    } catch {
      setDetailsDocs([])
    }
  }

  const fetchSingleApplication = async (kycId: string) => {
    try {
      const res = await fetch(`/api/admin/applications?kycId=${encodeURIComponent(kycId)}&limit=1`, { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      const fresh = Array.isArray(data.applications) ? data.applications[0] : null
      if (fresh && selectedApplication && fresh.kyc_id === selectedApplication.kyc_id) {
        setSelectedApplication({ ...selectedApplication, ...fresh })
      }
    } catch {}
  }

  const handleViewDetails = async (application: Application) => {
    setSelectedApplication(application)
    setShowDetailsDialog(true)
    setDetailsLoading(true)
    await Promise.all([
      fetchDetailsDocs(application.kyc_id),
      fetchSingleApplication(application.kyc_id),
    ])
    setDetailsLoading(false)
  }

  // Re-fetch details when parent refreshes while dialog is open
  useEffect(() => {
    if (showDetailsDialog && selectedApplication) {
      setDetailsRefreshing(true)
      Promise.all([
        fetchDetailsDocs(selectedApplication.kyc_id),
        fetchSingleApplication(selectedApplication.kyc_id),
      ]).finally(() => setDetailsRefreshing(false))
    }
  }, [refreshTrigger, showDetailsDialog, selectedApplication?.kyc_id])

  const handleDecisionComplete = () => {
    setShowDecisionDialog(false)
    setSelectedApplication(null)
    fetchApplications() // Refresh the list
  }

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      searchTerm === "" ||
      app.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.invited_company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg">
  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Loading applications...
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-6 bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
        <Input
          placeholder="Search by company name or email..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="ready_for_decision">Ready for Decision</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
          <SelectTrigger className="w-[180px] border-0 bg-white/70 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/90 transition-all duration-300">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-xl">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="supplier">Suppliers</SelectItem>
            <SelectItem value="buyer">Buyers</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={fetchApplications} 
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Applications Table */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
          <FileText className="h-16 w-16 text-blue-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-3">
            No applications found
          </h3>
          <p className="text-gray-600">No applications match your current filters.</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((application) => (
                <TableRow key={application.kyc_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {application.company_name || application.invited_company_name || "Unknown Company"}
                      </div>
                      <div className="text-sm text-gray-600">{application.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getUserTypeBadge(application.user_role)}</TableCell>
                  <TableCell>{getStatusBadge(application.kyc_status)}</TableCell>
                  <TableCell>{getDocumentProgress(application)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(application.submitted_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(application)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {application.kyc_status === "ready_for_decision" && (
                          <DropdownMenuItem onClick={() => handleMakeDecision(application)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Make Decision
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Decision Dialog */}
      {selectedApplication && (
        <AdminDecisionDialog
          open={showDecisionDialog}
          onOpenChange={setShowDecisionDialog}
          application={selectedApplication}
          onDecisionComplete={handleDecisionComplete}
        />
      )}

      {/* Details Dialog */}
      {selectedApplication && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="bg-white/95 backdrop-blur-lg max-h-[calc(100vh-2rem)] overflow-y-auto border-0 shadow-2xl rounded-3xl sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                Application Details
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Company and user information with related documents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Company</div>
                  <div className="text-lg font-semibold">{selectedApplication.company_name || selectedApplication.invited_company_name || "Unknown Company"}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="text-xs text-gray-500">Registration Number</div>
                      <div className="text-sm font-medium">{selectedApplication.registration_number || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Tax Number</div>
                      <div className="text-sm font-medium">{selectedApplication.tax_number || "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Applicant User</div>
                  <div className="text-lg font-semibold">{selectedApplication.email}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="text-xs text-gray-500">Type</div>
                      <div>{getUserTypeBadge(selectedApplication.user_role)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">KYC Status</div>
                      <div>{getStatusBadge(selectedApplication.kyc_status)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Submitted</div>
                      <div className="text-sm text-gray-700">{formatDate(selectedApplication.submitted_at)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Company Email</div>
                  <div className="text-sm text-gray-700">{selectedApplication.company_email || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Company Phone</div>
                  <div className="text-sm text-gray-700">{selectedApplication.company_phone || "—"}</div>
                </div>
                <div className="md:col-span-3">
                  <div className="text-sm font-medium mb-1">Business Address</div>
                  <div className="text-sm text-gray-700 whitespace-pre-line">{selectedApplication.company_address || "—"}</div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Documents</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedApplication) return
                      setDetailsRefreshing(true)
                      await Promise.all([
                        fetchDetailsDocs(selectedApplication.kyc_id),
                        fetchSingleApplication(selectedApplication.kyc_id),
                      ])
                      setDetailsRefreshing(false)
                    }}
                    disabled={detailsRefreshing}
                    className="h-8 px-3"
                  >
                    <span className="inline-flex items-center">
                      <span className="mr-2">Refresh</span>
                      <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${detailsRefreshing ? 'animate-spin' : ''}`} />
                    </span>
                  </Button>
                </div>
                {detailsLoading ? (
                  <div className="text-sm text-gray-500">Loading documents…</div>
                ) : detailsDocs.length === 0 ? (
                  <div className="text-sm text-gray-500">No documents found for this application.</div>
                ) : (
                  <div className="max-h-80 overflow-auto bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Uploaded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailsDocs.map((d) => (
                          <TableRow key={d.document_id}>
                            <TableCell className="text-sm font-medium">{d.filename}</TableCell>
                            <TableCell>
                              <Badge className="text-xs bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200 shadow-sm">
                                {d.document_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(d.document_status)}</TableCell>
                            <TableCell className="text-sm text-gray-600">{formatDate(d.upload_date)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
