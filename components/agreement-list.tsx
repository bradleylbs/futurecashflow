"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface Agreement {
  id: string
  agreement_type: string
  agreement_version: string
  status: string
  agreement_content?: string
  presented_at: string
  signed_at?: string
  expiry_date?: string
  // Newly added optional fields to show buyer/counterparty context
  counterparty_user_id?: string | number | null
  counterparty_email?: string | null
  counterparty_company_name?: string | null
}

interface AgreementListProps {
  onSelectAgreement: (agreement: Agreement) => void
}

export function AgreementList({ onSelectAgreement }: AgreementListProps) {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgreements()
  }, [])

  const fetchAgreements = async () => {
    try {
      const response = await fetch("/api/agreements", { credentials: "include" })
      if (response.ok) {
        const data = await response.json()
        const list: Agreement[] = data.agreements || []
        setAgreements(list)
        // If there's a presented agreement, auto-open it for signing
        const presented = list.find(a => a.status === 'presented')
        if (presented) {
          onSelectAgreement(presented)
        }
      }
    } catch (error) {
      console.error("Error fetching agreements:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
  return <CheckCircle className="h-5 w-5 text-blue-500" />
      case "presented":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "expired":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-200/50 backdrop-blur-sm">
            {status.replace("_", " ").toUpperCase()}
          </span>
        )
      case "presented":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200/50 backdrop-blur-sm">
            {status.replace("_", " ").toUpperCase()}
          </span>
        )
      case "expired":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200/50 backdrop-blur-sm">
            {status.replace("_", " ").toUpperCase()}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200/50 backdrop-blur-sm">
            {status.replace("_", " ").toUpperCase()}
          </span>
        )
    }
  }

  const getAgreementTitle = (type: string) => {
    const titles = {
      supplier_terms: "Supplier Terms and Conditions",
      buyer_terms: "Buyer Terms and Conditions",
      facility_agreement: "Facility Agreement",
    }
    return titles[type as keyof typeof titles] || "Agreement"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/70 backdrop-blur-sm rounded-full shadow-lg mb-4">
            <FileText className="h-8 w-8 animate-pulse text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-2">
            Loading Agreements
          </h3>
          <p className="text-gray-500">Please wait while we fetch your agreements...</p>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2"></div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (agreements.length === 0) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
            No Agreements Available
          </h3>
          <p className="text-gray-500 text-lg">No agreements have been presented to you yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {agreements.map((agreement) => (
        <Card key={agreement.id} className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-xl flex items-center gap-3 text-gray-900">
                  {getStatusIcon(agreement.status)}
                  <span className="font-semibold">
                    {getAgreementTitle(agreement.agreement_type)}
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600 font-medium">
                  Version {agreement.agreement_version}
                  {agreement.counterparty_user_id && (
                    <>
                      {' '}
                      &bull; Buyer: {agreement.counterparty_company_name || agreement.counterparty_email}
                    </>
                  )}
                </CardDescription>
              </div>
              {getStatusBadge(agreement.status)}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Presented:</span>
                  <span>{new Date(agreement.presented_at).toLocaleDateString()}</span>
                </div>
                {agreement.signed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Signed:</span>
                    <span>{new Date(agreement.signed_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {agreement.status === "presented" && (
                <Button 
                  onClick={() => onSelectAgreement(agreement)} 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl"
                >
                  Sign Agreement Electronically
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
