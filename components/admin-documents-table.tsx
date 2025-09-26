"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  MoreHorizontal,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Building2,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  Shield,
  FileCheck,
  FileClock,
  FileX,
  FileSearch,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Hash,
  FolderOpen,
  Archive,
  Zap,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { DocumentReviewDialog } from "@/components/document-review-dialog"

// Enhanced interfaces
interface Document {
  document_id: string
  document_type: string
  filename: string
  file_size: number
  document_status: "uploaded" | "pending" | "under_review" | "verified" | "rejected"
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

// Document type configuration
const DOCUMENT_TYPE_CONFIG = {
  business_registration: {
    label: "Business Registration",
    icon: Building2,
    color: "blue",
    description: "Company registration and incorporation documents"
  },
  mandate: {
    label: "Company Mandate", 
    icon: Shield,
    color: "purple",
    description: "Authorization and mandate documentation"
  },
  proof_of_address: {
    label: "Proof of Address",
    icon: Building2,
    color: "green",
    description: "Business address verification"
  },
  financial_statement: {
    label: "Financial Statement",
    icon: FileText,
    color: "amber",
    description: "Financial records and statements"
  },
  tax_clearance: {
    label: "Tax Clearance",
    icon: FileCheck,
    color: "red",
    description: "Tax compliance documentation"
  },
  bank_confirmation: {
    label: "Bank Confirmation",
    icon: Building2,
    color: "indigo",
    description: "Banking relationship confirmation"
  }
}

// Document Stats Card Component
const DocumentStatsCard: React.FC<{
  title: string
  value: number | string
  icon: React.ElementType
  color?: string
  subtitle?: string
  loading?: boolean
}> = ({ title, value, icon: Icon, color = "blue", subtitle, loading }) => {
  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const colorStyles: Record<string, string> = {
    blue: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    green: "from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30",
    amber: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    red: "from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30",
  }

  return (
    <div className={`
      relative overflow-hidden p-4 rounded-xl bg-gradient-to-br ${(colorStyles as Record<string, string>)[color] || colorStyles.blue} 
      backdrop-blur-sm border hover:scale-[1.02] transition-all duration-300 cursor-pointer group
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold mt-2 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

export function AdminDocumentsTable({ refreshTrigger }: AdminDocumentsTableProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
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
      setError("Failed to load documents. Please try again.")
      console.error("Fetch documents error:", error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, documentTypeFilter])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments, refreshTrigger])

  // Filter documents based on search
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (!searchTerm) return true
      
      const searchLower = searchTerm.toLowerCase()
      return (
        doc.filename.toLowerCase().includes(searchLower) ||
        doc.email.toLowerCase().includes(searchLower) ||
        doc.company_name?.toLowerCase().includes(searchLower) ||
        doc.invited_company_name?.toLowerCase().includes(searchLower) ||
        doc.document_type.toLowerCase().includes(searchLower)
      )
    })
  }, [documents, searchTerm])

  // Group documents by company
  const groupedDocuments = useMemo(() => {
    const groups = filteredDocuments.reduce((acc, doc) => {
      const key = (doc.company_name || doc.invited_company_name || doc.email || 'Unknown').trim()
      if (!acc[key]) {
        acc[key] = {
          documents: [],
          stats: {
            total: 0,
            pending: 0,
            verified: 0,
            rejected: 0,
            under_review: 0
          }
        }
      }
      acc[key].documents.push(doc)
      acc[key].stats.total++
      
      // Update stats
      if (doc.document_status === 'pending') acc[key].stats.pending++
      else if (doc.document_status === 'verified') acc[key].stats.verified++
      else if (doc.document_status === 'rejected') acc[key].stats.rejected++
      else if (doc.document_status === 'under_review') acc[key].stats.under_review++
      
      return acc
    }, {} as Record<string, { documents: Document[], stats: any }>)
    
    return groups
  }, [filteredDocuments])

  // Sort functionality
  const sortedDocuments = useMemo(() => {
    if (!sortConfig || viewMode === 'grouped') return filteredDocuments
    return [...filteredDocuments].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key]
      const bValue = (b as any)[sortConfig.key]
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredDocuments, sortConfig, viewMode])

  // Calculate overall statistics
  type OverallStats = {
    total: number;
    pending: number;
    under_review: number;
    verified: number;
    rejected: number;
    completion: number;
  };
  const overallStats: OverallStats = useMemo(() => {
    const stats = {
      total: documents.length,
      pending: documents.filter(d => d.document_status === 'pending').length,
      under_review: documents.filter(d => d.document_status === 'under_review').length,
      verified: documents.filter(d => d.document_status === 'verified').length,
      rejected: documents.filter(d => d.document_status === 'rejected').length,
      completion: 0,
    };
    stats.completion = stats.total > 0 
      ? Math.round(((stats.verified + stats.rejected) / stats.total) * 100)
      : 0;
    return stats;
  }, [documents]);

  // Enhanced status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploaded: {
        icon: Clock,
        label: "Uploaded",
        bgClass: "bg-gray-500/20 text-gray-400 border-gray-500/30"
      },
      pending: {
        icon: FileClock,
        label: "Pending",
        bgClass: "bg-amber-500/20 text-amber-400 border-amber-500/30"
      },
      under_review: {
        icon: Eye,
        label: "Under Review",
        bgClass: "bg-blue-500/20 text-blue-400 border-blue-500/30"
      },
      verified: {
        icon: CheckCircle,
        label: "Verified",
        bgClass: "bg-green-500/20 text-green-400 border-green-500/30"
      },
      rejected: {
        icon: XCircle,
        label: "Rejected",
        bgClass: "bg-red-500/20 text-red-400 border-red-500/30"
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${config.bgClass} font-medium`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Document is {config.label.toLowerCase()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Format date with relative time
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not reviewed"
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    })
  }

  // Handle document review
  const handleReviewDocument = (document: Document) => {
    setSelectedDocument(document)
    setShowReviewDialog(true)
  }

  // Handle review completion
  const handleReviewComplete = () => {
    setShowReviewDialog(false)
    setSelectedDocument(null)
    fetchDocuments()
    setSuccessMessage("Document review completed successfully")
    setTimeout(() => setSuccessMessage(""), 5000)
  }

  // Handle quick review
  const handleQuickReview = async (document: Document, decision: 'verified' | 'rejected') => {
    try {
      const response = await fetch(`/api/admin/documents/${document.document_id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          decision, 
          notes: decision === 'verified' ? 'Quick approval' : 'Quick rejection' 
        })
      })
      
      if (response.ok) {
        fetchDocuments()
        setSuccessMessage(`Document ${decision === 'verified' ? 'approved' : 'rejected'} successfully`)
        setTimeout(() => setSuccessMessage(""), 5000)
      }
    } catch (error) {
      setError("Failed to update document status")
      setTimeout(() => setError(""), 5000)
    }
  }

  // Toggle company expansion
  const toggleCompanyExpansion = (company: string) => {
    setExpandedCompanies(prev => 
      prev.includes(company) 
        ? prev.filter(c => c !== company)
        : [...prev, company]
    )
  }

  // Handle sort
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <DocumentStatsCard
            title="Total"
            value={overallStats.total}
            icon={FileText}
            color="blue"
            loading={isLoading}
          />
          <DocumentStatsCard
            title="Pending"
            value={overallStats.pending}
            icon={FileClock}
            color="amber"
            loading={isLoading}
          />
          <DocumentStatsCard
            title="In Review"
            value={overallStats.under_review}
            icon={Eye}
            color="blue"
            loading={isLoading}
          />
          <DocumentStatsCard
            title="Verified"
            value={overallStats.verified}
            icon={CheckCircle}
            color="green"
            loading={isLoading}
          />
          <DocumentStatsCard
            title="Rejected"
            value={overallStats.rejected}
            icon={XCircle}
            color="red"
            loading={isLoading}
          />
          <DocumentStatsCard
            title="Completion"
            value={`${overallStats.completion}%`}
            icon={TrendingUp}
            color="green"
            subtitle="Review progress"
            loading={isLoading}
          />
        </div>

        {/* Enhanced Filters and Controls */}
        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents, companies, emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
              />
              {searchTerm && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setSearchTerm("")}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSearchTerm("") }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <XCircle className="h-4 w-4" />
                </span>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Document Type Filter */}
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/10">
                <FileText className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <SelectItem value="all">All Document Types</SelectItem>
                {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="h-4 w-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grouped" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grouped")}
                className="bg-white/5 border-white/10"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Grouped
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="bg-white/5 border-white/10"
              >
                <FileText className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>

            {/* Refresh Button */}
            <Button 
              onClick={fetchDocuments} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{filteredDocuments.length} documents found</span>
              {searchTerm && (
                <Badge variant="secondary" className="bg-white/10">
                  Searching: "{searchTerm}"
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedCompanies(Object.keys(groupedDocuments))}
                className="text-xs hover:bg-white/10"
              >
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedCompanies([])}
                className="text-xs hover:bg-white/10"
              >
                Collapse All
              </Button>
            </div>
          </div>
        </div>

        {/* Document Display */}
        {filteredDocuments.length === 0 ? (
          <EmptyState />
        ) : viewMode === "grouped" ? (
          <GroupedView
            groupedDocuments={groupedDocuments}
            expandedCompanies={expandedCompanies}
            toggleCompanyExpansion={toggleCompanyExpansion}
            handleReviewDocument={handleReviewDocument}
            handleQuickReview={handleQuickReview}
            getStatusBadge={getStatusBadge}
            formatFileSize={formatFileSize}
            formatDate={formatDate}
            DOCUMENT_TYPE_CONFIG={DOCUMENT_TYPE_CONFIG}
          />
        ) : (
          <ListView
            documents={sortedDocuments}
            handleSort={handleSort}
            sortConfig={sortConfig}
            handleReviewDocument={handleReviewDocument}
            handleQuickReview={handleQuickReview}
            getStatusBadge={getStatusBadge}
            formatFileSize={formatFileSize}
            formatDate={formatDate}
            DOCUMENT_TYPE_CONFIG={DOCUMENT_TYPE_CONFIG}
          />
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
    </TooltipProvider>
  )
}

// Grouped View Component
interface GroupedViewProps {
  groupedDocuments: Record<string, { documents: Document[]; stats: any }>;
  expandedCompanies: string[];
  toggleCompanyExpansion: (company: string) => void;
  handleReviewDocument: (document: Document) => void;
  handleQuickReview: (document: Document, decision: 'verified' | 'rejected') => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
  DOCUMENT_TYPE_CONFIG: typeof DOCUMENT_TYPE_CONFIG;
}
const GroupedView = ({
  groupedDocuments,
  expandedCompanies,
  toggleCompanyExpansion,
  handleReviewDocument,
  handleQuickReview,
  getStatusBadge,
  formatFileSize,
  formatDate,
  DOCUMENT_TYPE_CONFIG
}: GroupedViewProps) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
    <Accordion type="multiple" value={expandedCompanies} className="divide-y divide-white/10">
      {Object.entries(groupedDocuments).map(([companyKey, group]: [string, any]) => {
        const nextPending = group.documents.find((d: Document) => 
          d.document_status === 'pending' || d.document_status === 'under_review'
        )
        
        return (
          <AccordionItem key={companyKey} value={companyKey} className="border-0">
            <AccordionTrigger
              onClick={() => toggleCompanyExpansion(companyKey)}
              className="px-6 py-4 hover:bg-white/5 hover:no-underline group"
            >
              <div className="w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 group-hover:scale-110 transition-transform">
                    <Building2 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{companyKey}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.documents[0].email || `${group.documents.length} documents`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {group.stats.pending > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      {group.stats.pending} Pending
                    </Badge>
                  )}
                  {group.stats.verified > 0 && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {group.stats.verified} Verified
                    </Badge>
                  )}
                  {group.stats.rejected > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      {group.stats.rejected} Rejected
                    </Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedCompanies.includes(companyKey) ? 'rotate-180' : ''
                  }`} />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              {/* Move Review Next button here, only show if expanded and nextPending exists */}
              {expandedCompanies.includes(companyKey) && nextPending && (
                <div className="px-6 pt-4 pb-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReviewDocument(nextPending)}
                    className="border-blue-500/30 hover:bg-blue-500/20"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Review Next
                  </Button>
                </div>
              )}
              <div className="px-6 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10">
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.documents.map((doc: Document) => {
                      const typeConfig = DOCUMENT_TYPE_CONFIG[doc.document_type as keyof typeof DOCUMENT_TYPE_CONFIG]
                      const TypeIcon = typeConfig?.icon || FileText
                      
                      return (
                        <TableRow 
                          key={doc.document_id}
                          className="border-b border-white/5 hover:bg-white/5 transition-all"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{doc.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-white/10">
                              {typeConfig?.label || doc.document_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.document_status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(doc.upload_date)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatFileSize(doc.file_size)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {doc.document_status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleQuickReview(doc, 'verified')}
                                    className="h-8 w-8 p-0 hover:bg-green-500/20"
                                    title="Quick Approve"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleQuickReview(doc, 'rejected')}
                                    className="h-8 w-8 p-0 hover:bg-red-500/20"
                                    title="Quick Reject"
                                  >
                                    <XCircle className="h-4 w-4 text-red-400" />
                                  </Button>
                                </>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-white/10"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                                  <DropdownMenuLabel>Document Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem 
                                    onClick={() => handleReviewDocument(doc)}
                                    className="hover:bg-white/10"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Review Document
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => window.open(`/api/admin/documents/${doc.document_id}/preview`, '_blank')}
                                    className="hover:bg-white/10"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="hover:bg-white/10">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Original
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  </div>
)

// List View Component  
interface ListViewProps {
  documents: Document[];
  handleSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  handleReviewDocument: (document: Document) => void;
  handleQuickReview: (document: Document, decision: 'verified' | 'rejected') => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
  DOCUMENT_TYPE_CONFIG: typeof DOCUMENT_TYPE_CONFIG;
}
const ListView = ({
  documents,
  handleSort,
  sortConfig,
  handleReviewDocument,
  handleQuickReview,
  getStatusBadge,
  formatFileSize,
  formatDate,
  DOCUMENT_TYPE_CONFIG
}: ListViewProps) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
    <ScrollArea className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/10">
            <TableHead 
              onClick={() => handleSort('filename')}
              className="cursor-pointer hover:text-foreground transition-colors"
            >
              Document {sortConfig?.key === 'filename' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Company</TableHead>
            <TableHead 
              onClick={() => handleSort('document_type')}
              className="cursor-pointer hover:text-foreground transition-colors"
            >
              Type {sortConfig?.key === 'document_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              onClick={() => handleSort('document_status')}
              className="cursor-pointer hover:text-foreground transition-colors"
            >
              Status {sortConfig?.key === 'document_status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              onClick={() => handleSort('upload_date')}
              className="cursor-pointer hover:text-foreground transition-colors"
            >
              Uploaded {sortConfig?.key === 'upload_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc: Document) => {
            const typeConfig = DOCUMENT_TYPE_CONFIG[doc.document_type as keyof typeof DOCUMENT_TYPE_CONFIG]
            const TypeIcon = typeConfig?.icon || FileText
            
            return (
              <TableRow 
                key={doc.document_id}
                className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => handleReviewDocument(doc)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{doc.filename}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{doc.company_name || doc.invited_company_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{doc.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-white/10">
                    {typeConfig?.label || doc.document_type}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(doc.document_status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(doc.upload_date)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    {doc.document_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuickReview(doc, 'verified')}
                          className="h-8 w-8 p-0 hover:bg-green-500/20"
                          title="Quick Approve"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuickReview(doc, 'rejected')}
                          className="h-8 w-8 p-0 hover:bg-red-500/20"
                          title="Quick Reject"
                        >
                          <XCircle className="h-4 w-4 text-red-400" />
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-white/10"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                        <DropdownMenuItem 
                          onClick={() => handleReviewDocument(doc)}
                          className="hover:bg-white/10"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Review Document
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open(`/api/admin/documents/${doc.document_id}/preview`, '_blank')}
                          className="hover:bg-white/10"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  </div>
)

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
    
    {/* Filters Skeleton */}
    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
    
    {/* Table Skeleton */}
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-white/5 last:border-0">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      ))}
    </div>
  </div>
)

// Empty State Component
const EmptyState = () => (
  <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
    <FileSearch className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
    <h3 className="text-xl font-semibold mb-2">No documents found</h3>
    <p className="text-muted-foreground max-w-md mx-auto">
      No documents match your current filters. Try adjusting your search criteria or clearing filters.
    </p>
    <Button variant="outline" className="mt-6 border-white/20 hover:bg-white/10">
      <RefreshCw className="h-4 w-4 mr-2" />
      Clear Filters
    </Button>
  </div>
)