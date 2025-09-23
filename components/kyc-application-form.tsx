"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building, Save } from "lucide-react"

interface KYCApplicationFormProps {
  onApplicationCreated?: (kycId: string, companyId: string) => void
  initialData?: any
}

export function KYCApplicationForm({ onApplicationCreated, initialData }: KYCApplicationFormProps) {
  const [formData, setFormData] = useState({
    companyName: "",
    registrationNumber: "",
    taxNumber: "",
    email: "",
    phone: "",
    address: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.company_name || "",
        registrationNumber: initialData.registration_number || "",
        taxNumber: initialData.tax_number || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
      })
    }
  }, [initialData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.companyName || !formData.registrationNumber || !formData.taxNumber) {
      setError("Company name, registration number, and tax number are required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/kyc/application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create KYC application")
        return
      }

      setSuccess(true)
      onApplicationCreated?.(data.kycId, data.companyId)
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center py-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-200 shadow-lg">
            <Building className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-3">
            Application Created!
          </CardTitle>
          <CardDescription className="text-gray-700 font-medium text-lg leading-relaxed">
            Your KYC application has been created successfully. You can now upload required documents.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
          <Building className="h-6 w-6 text-blue-500" />
          Company Information
        </CardTitle>
        <CardDescription className="text-gray-700 font-medium">
          Provide your company details to start the KYC process
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur border-0 shadow-lg rounded-xl">
              <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="companyName" className="font-semibold text-gray-800">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Enter company name"
                required
                className="bg-white/80 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-400/40 focus:bg-white/90 transition-all duration-300 py-3"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="registrationNumber" className="font-semibold text-gray-800">
                Registration Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleInputChange}
                placeholder="Enter registration number"
                required
                className="bg-white/80 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-400/40 focus:bg-white/90 transition-all duration-300 py-3"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="taxNumber" className="font-semibold text-gray-800">
                Tax Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="taxNumber"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleInputChange}
                placeholder="Enter tax number"
                required
                className="bg-white/80 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-400/40 focus:bg-white/90 transition-all duration-300 py-3"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="font-semibold text-gray-800">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className="bg-white/80 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-400/40 focus:bg-white/90 transition-all duration-300 py-3"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="phone" className="font-semibold text-gray-800">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                className="bg-white/80 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-400/40 focus:bg-white/90 transition-all duration-300 py-3"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="address" className="font-semibold text-gray-800">Business Address</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter complete business address"
              rows={3}
              className="bg-white/80 border-0 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-400/40 focus:bg-white/90 transition-all duration-300 resize-none"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 border-0" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Application...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Create KYC Application
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
