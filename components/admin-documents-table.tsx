"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MoreHorizontal, RefreshCw, Eye, CheckCircle, XCircle, Clock, FileText, Download, Building2 } from "lucide-react"
import { DocumentReviewDialog } from "@/components/document-review-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Document {
  document_id: string
  document_type: string
  filename: string
  file_size: number
  document_status: string
  upload_date: string
  review_date?: string
  review_notes?: string
  kyc_id: string
  kyc_status: string
  user_id: string
  email: string
  user_role: string
  company_name: string
  invited_company_name?: string
}

interface AdminDocumentsTableProps {
  refreshTrigger?: number
}

const DOCUMENT_TYPE_LABELS = {
  business_registration: "Business Registration",
  mandate: "Company Mandate",
  proof_of_address: "Proof of Address",
  financial_statement: "Financial Statement",
  tax_clearance: "Tax Clearance",
  bank_confirmation: "Bank Confirmation",
}

export function AdminDocumentsTable({ refreshTrigger }: AdminDocumentsTableProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all")
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [expanded, setExpanded] = useState<string | undefined>(undefined)

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (documentTypeFilter !== "all") params.append("documentType", documentTypeFilter)

      const response = await fetch(`/api/admin/documents?${params.toString()}`, { credentials: "include" })

      if (!response.ok) {
        const msg = await response.text().catch(() => "")
        throw new Error(`Failed to fetch documents (${response.status}) ${msg}`)
      }

      const data = await response.json()
      setDocuments(data.documents || [])
      setError("")
    } catch (error) {
      setError("Failed to load documents")
      console.error("Fetch documents error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [refreshTrigger, statusFilter, documentTypeFilter])

  // Group by company (prefer concrete company_name else invited_company_name else email)
  const groups = documents.reduce((acc, d) => {
    const key = (d.company_name || d.invited_company_name || d.email || 'Unknown').trim()
    if (!acc[key]) acc[key] = [] as Document[]
    acc[key].push(d)
    return acc
  }, {} as Record<string, Document[]>)

  const groupKeys = Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploaded: { 
        icon: Clock, 
        label: "Uploaded", 
        bgClass: "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200 shadow-sm" 
      },
      pending: { 
        icon: Clock, 
        label: "Pending", 
  bgClass: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 shadow-sm" 
      },
      under_review: { 
        icon: Eye, 
        label: "Under Review", 
        bgClass: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 shadow-sm" 
      },
      verified: { 
        icon: CheckCircle, 
        label: "Verified", 
  bgClass: "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 shadow-sm" 
      },
      rejected: { 
        icon: XCircle, 
        label: "Rejected", 
        bgClass: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200 shadow-sm" 
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`flex items-center gap-2 ${config.bgClass}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not reviewed"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleReviewDocument = (document: Document) => {
    setSelectedDocument(document)
    setShowReviewDialog(true)
  }

  const handleReviewComplete = () => {
    setShowReviewDialog(false)
    setSelectedDocument(null)
    fetchDocuments() // Refresh the list
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-sm rounded-xl border-0 shadow-lg">
  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Loading documents...
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-0 bg-white/70 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/90 transition-all duration-300">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-xl">
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
          <SelectTrigger className="w-[200px] border-0 bg-white/70 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/90 transition-all duration-300">
            <SelectValue placeholder="Filter by document type" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-xl">
            <SelectItem value="all">All Document Types</SelectItem>
            <SelectItem value="business_registration">Business Registration</SelectItem>
            <SelectItem value="mandate">Company Mandate</SelectItem>
            <SelectItem value="proof_of_address">Proof of Address</SelectItem>
            <SelectItem value="financial_statement">Financial Statement</SelectItem>
            <SelectItem value="tax_clearance">Tax Clearance</SelectItem>
            <SelectItem value="bank_confirmation">Bank Confirmation</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={fetchDocuments} 
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Grouped Documents */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-3">
            No documents found
          </h3>
          <p className="text-gray-500 text-lg">No documents match your current filters.</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border-0 shadow-lg overflow-hidden">
          <Accordion type="single" collapsible value={expanded} onValueChange={setExpanded} className="divide-y divide-gray-100">
            {groupKeys.map((companyKey) => {
              const items = groups[companyKey]
              const pendingCount = items.filter(i => i.document_status === 'pending' || i.document_status === 'under_review').length
              const verifiedCount = items.filter(i => i.document_status === 'verified').length
              const rejectedCount = items.filter(i => i.document_status === 'rejected').length
              const first = items[0]
              const subtitle = first?.email || `${items.length} documents`
              const nextPending = items.find(i => i.document_status === 'pending' || i.document_status === 'under_review')
              return (
                <AccordionItem key={companyKey} value={companyKey} className="px-2">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="w-full flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-100"><Building2 className="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <div className="font-semibold text-gray-900">{companyKey}</div>
                          <div className="text-xs text-gray-500">{subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending {pendingCount}</Badge>
                        <Badge className="bg-green-100 text-green-800 border-green-200">Verified {verifiedCount}</Badge>
                        <Badge className="bg-red-100 text-red-800 border-red-200">Rejected {rejectedCount}</Badge>
                        {nextPending && (
                          <Button asChild size="sm" variant="outline" className="ml-2">
                            <span
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleReviewDocument(nextPending)
                              }}
                            >
                              Review next
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="rounded-lg border border-gray-100 overflow-hidden">
                      <Table className="border-collapse">
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-gray-50/80 to-gray-100/80">
                            <TableHead className="font-semibold text-gray-700 py-3 px-4">Document</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-3 px-4">Type</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-3 px-4">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700 py-3 px-4">Uploaded</TableHead>
                            <TableHead className="w-[50px] py-3 px-4"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((document) => (
                            <TableRow key={document.document_id} className="hover:bg-white/80 transition-all duration-200 border-b border-gray-100/50">
                              <TableCell className="py-3 px-4">
                                <div>
                                  <div className="font-medium text-gray-900">{document.filename}</div>
                                  <div className="text-sm text-gray-500">{formatFileSize(document.file_size)}</div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100/80 text-blue-800">
                                  {DOCUMENT_TYPE_LABELS[document.document_type as keyof typeof DOCUMENT_TYPE_LABELS] || document.document_type}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 px-4">{getStatusBadge(document.document_status)}</TableCell>
                              <TableCell className="py-3 px-4 text-sm text-gray-600">{formatDate(document.upload_date)}</TableCell>
                              <TableCell className="py-3 px-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="border-0 bg-white/70 hover:bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-gray-600" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-xl min-w-[160px]">
                                    <DropdownMenuItem 
                                      onClick={() => handleReviewDocument(document)}
                                      className="hover:bg-blue-50/80 focus:bg-blue-50/80 rounded-lg mx-1 my-1 transition-all duration-200"
                                    >
                                      <Eye className="mr-2 h-4 w-4 text-blue-600" />
                                      <span className="text-gray-700">Review Document</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => window.open(`/api/admin/documents/${document.document_id}/preview`, '_blank')}
                                      className="hover:bg-blue-50/80 focus:bg-blue-50/80 rounded-lg mx-1 my-1 transition-all duration-200"
                                    >
                                      <Download className="mr-2 h-4 w-4 text-blue-600" />
                                      <span className="text-gray-700">Download</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      )}

      {/* Review Dialog */}
      {selectedDocument && (
        <DocumentReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          document={selectedDocument}
          onReviewComplete={handleReviewComplete}
        />
      )}
    </div>
  )
}
