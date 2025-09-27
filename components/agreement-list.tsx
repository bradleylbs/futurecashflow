"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  Download,
  Eye,
  Building
} from "lucide-react"

interface Agreement {
  id: string
  agreement_type: string
  agreement_version: string
  status: string
  agreement_content?: string
  presented_at: string
  signed_at?: string
  expiry_date?: string
  counterparty_user_id?: string | number | null
  counterparty_email?: string | null
  counterparty_company_name?: string | null
}

interface AgreementListProps {
  onSelectAgreement: (agreement: Agreement) => void
}

const STATUS_COLORS: Record<string, string> = {
  'signed': 'bg-green-500/10 text-green-500 border-green-500/20',
  'presented': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'expired': 'bg-red-500/10 text-red-500 border-red-500/20',
}

const getAgreementTitle = (type: string): string => {
  const titles: Record<string, string> = {
    supplier_terms: "Supplier Terms and Conditions",
    buyer_terms: "Buyer Terms and Conditions",
    facility_agreement: "Facility Agreement",
  }
  return titles[type] || "Agreement"
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} className="h-32 w-full" />
    ))}
  </div>
)

const EmptyState = () => (
  <div className="text-center py-12">
    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
    <h3 className="text-lg font-semibold mb-2">No Agreements Available</h3>
    <p className="text-sm text-muted-foreground">
      No agreements have been presented to you yet
    </p>
  </div>
)

export function AgreementList({ onSelectAgreement }: AgreementListProps) {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [filteredAgreements, setFilteredAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      
      const response = await fetch("/api/agreements", { credentials: "include" })
      
      if (!response.ok) throw new Error("Failed to fetch agreements")
      
      const data = await response.json()
      const list: Agreement[] = data.agreements || []
      setAgreements(list)
      setFilteredAgreements(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agreements")
      setAgreements([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgreements()
  }, [fetchAgreements])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = agreements.filter(agreement => 
        getAgreementTitle(agreement.agreement_type).toLowerCase().includes(searchQuery.toLowerCase()) ||
        agreement.agreement_version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agreement.counterparty_company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agreement.counterparty_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredAgreements(filtered)
    } else {
      setFilteredAgreements(agreements)
    }
  }, [searchQuery, agreements])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "presented":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "expired":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      {agreements.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agreements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Agreements List */}
      {filteredAgreements.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {filteredAgreements.map((agreement) => (
            <Card key={agreement.id} className="border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.01]">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(agreement.status)}
                      {getAgreementTitle(agreement.agreement_type)}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      <span>Version {agreement.agreement_version}</span>
                      {agreement.counterparty_company_name && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {agreement.counterparty_company_name}
                          </span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={STATUS_COLORS[agreement.status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}
                  >
                    {agreement.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Presented: {new Date(agreement.presented_at).toLocaleDateString()}</span>
                    </div>
                    {agreement.signed_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Signed: {new Date(agreement.signed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {agreement.status === "signed" && (
                      <Button 
                        onClick={() => onSelectAgreement(agreement)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                    {agreement.status === "presented" && (
                      <Button 
                        onClick={() => onSelectAgreement(agreement)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Sign Agreement
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}