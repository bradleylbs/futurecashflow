"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Clock,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  FileIcon,
  Eye,
  Loader2,
  Building,
  FileText,
  Shield,
  PartyPopper,
  RefreshCw,
  Upload,
  ChevronRight,
  Check,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { LogOut } from "lucide-react"
import { AgreementSigning } from "@/components/agreement-signing"

// Logo Component matching presentation exactly
const LogoIcon = ({ className = "w-10 h-10 text-blue-600" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

// Enhanced interface definitions with strict typing
interface CompanyDetails {
  id?: string
  company_name: string
  registration_number: string
  tax_number: string
  phone?: string
  email?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  country?: string
  company_type: string
}

interface KYCDocument {
  id: string
  name: string
  type: string
  size: number
  uploaded: boolean
  url?: string
  previewUrl?: string
  uploadedAt?: string
  status?: "pending" | "approved" | "rejected"
  filename?: string
  original_filename?: string
}

// Enhanced type definitions
type ApplicationTab = "details" | "documents" | "complete"
type KYCStatus = "pending" | "under_review" | "approved" | "rejected" | "none"

// Constants
const VALIDATION_RULES = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: [".pdf", ".jpg", ".jpeg", ".png"],
  REQUEST_TIMEOUT: 15000, // 15 seconds
} as const

const SUPPLIER_DOCUMENTS: KYCDocument[] = [
  { id: "1", name: "Business Registration Certificate", type: "business_registration", size: 0, uploaded: false },
  { id: "2", name: "Signed Mandate", type: "mandate", size: 0, uploaded: false },
  { id: "3", name: "Proof of Address", type: "proof_of_address", size: 0, uploaded: false },
]

const BUYER_DOCUMENTS: KYCDocument[] = [
  { id: "1", name: "Business Registration Certificate", type: "business_registration", size: 0, uploaded: false },
  { id: "2", name: "Financial Statement (Latest)", type: "financial_statement", size: 0, uploaded: false },
  { id: "3", name: "Tax Clearance Certificate", type: "tax_clearance", size: 0, uploaded: false },
  { id: "4", name: "Bank Confirmation Letter", type: "bank_confirmation", size: 0, uploaded: false },
]

// Dynamic field configuration
const companyFields = [
  { name: "company_name", label: "Company Name", type: "text", required: true },
  { name: "registration_number", label: "Registration Number", type: "text", required: true },
  { name: "tax_number", label: "Tax Number", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "text", required: true },
  { name: "address", label: "Address", type: "textarea", required: true },
  { 
    name: "company_type", 
    label: "Company Type", 
    type: "select", 
    required: true, 
    options: [
      { value: "supplier", label: "Supplier" },
      { value: "buyer", label: "Buyer" },
    ] 
  },
]

// Enhanced Step Indicator Component
const StepIndicator = ({ activeTab, progress }: { activeTab: ApplicationTab; progress: number }) => {
  const steps = [
    { id: "details", label: "Details", icon: Building },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "complete", label: "Complete", icon: Check },
  ]
  
  const getStepStatus = (stepId: string) => {
    if (stepId === activeTab) return "active"
    if (steps.findIndex(s => s.id === stepId) < steps.findIndex(s => s.id === activeTab)) return "completed"
    return "pending"
  }

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id)
        const Icon = step.icon
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                ${status === "completed" 
                  ? "bg-blue-600 border-blue-600 text-white" 
                  : status === "active"
                  ? "bg-blue-600 border-blue-600 text-white animate-pulse"
                  : "bg-muted border-border text-muted-foreground"
                }
              `}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`
                  text-sm font-semibold transition-colors duration-300
                  ${status === "active" ? "text-blue-600" : status === "completed" ? "text-foreground" : "text-muted-foreground"}
                `}>
                  {step.label}
                </p>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-0.5 ml-4 mr-4 transition-colors duration-300
                ${steps.findIndex(s => s.id === step.id) < steps.findIndex(s => s.id === activeTab) 
                  ? "bg-blue-600" 
                  : "bg-border"
                }
              `} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Enhanced Facility Application Component
const FacilityApplication: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ApplicationTab>("details")
  const [progress, setProgress] = useState(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Store kycId for document uploads
  const [kycId, setKycId] = useState<string | undefined>()

  const router = useRouter()
  const { toast } = useToast()
  
  // Logout and restart helpers
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {}
    router.push("/auth/login")
  }, [router])

  const handleStartNewApplication = useCallback(async () => {
    await handleLogout()
    try {
      router.replace("/facility-application")
    } finally {
      setTimeout(() => {
        window.location.reload()
      }, 50)
    }
  }, [handleLogout, router])
  
  // Initialize company details
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    company_name: "",
    registration_number: "",
    tax_number: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "South Africa",
    company_type: "supplier",
  })

  const [requiredDocuments, setRequiredDocuments] = useState<KYCDocument[]>(
    companyDetails.company_type === "supplier" ? SUPPLIER_DOCUMENTS : BUYER_DOCUMENTS,
  )

  // Loading and error states
  const [uploading, setUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Application status states
  const [kycSubmitted, setKycSubmitted] = useState(false)
  const [showKycWaitingPage, setShowKycWaitingPage] = useState(false)
  const [kycStatus, setKycStatus] = useState<KYCStatus>("pending")
  const [simulatedProgress, setSimulatedProgress] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [presentedAgreement, setPresentedAgreement] = useState<any | null>(null)
  
  // Document upload tracking
  const [documentUploads, setDocumentUploads] = useState<Record<number, File>>({})
  const [uploadingDocuments, setUploadingDocuments] = useState<Record<number, boolean>>({})
  
  // Track if company type was preselected (read-only)
  const [isCompanyTypePreselected, setIsCompanyTypePreselected] = useState(false)

  // Autocomplete hints for better browser autofill
  const autoCompleteMap: Record<string, string> = {
    company_name: "organization",
    registration_number: "off",
    tax_number: "off",
    email: "email",
    phone: "tel",
    address: "street-address",
    city: "address-level2",
    province: "address-level1",
    postal_code: "postal-code",
    country: "country-name",
    company_type: "off",
  }

  // Auto-select company type based on registration path
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const typeParam = params.get("type")
      if (typeParam === "buyer" || typeParam === "supplier") {
        setCompanyDetails((prev) => ({ ...prev, company_type: typeParam }))
        setIsCompanyTypePreselected(true)
        return
      }

      const registrationPath = window.sessionStorage.getItem("registration-path")
      if (registrationPath) {
        if (registrationPath === "/register") {
          setCompanyDetails((prev) => ({ ...prev, company_type: "buyer" }))
          setIsCompanyTypePreselected(true)
        } else if (registrationPath.includes("/register/supplier")) {
          setCompanyDetails((prev) => ({ ...prev, company_type: "supplier" }))
          setIsCompanyTypePreselected(true)
        }
        return
      }

      const referrer = document.referrer
      if (referrer) {
        if (referrer.includes("/register/supplier")) {
          setCompanyDetails((prev) => ({ ...prev, company_type: "supplier" }))
          setIsCompanyTypePreselected(true)
        } else if (referrer.includes("/register") && !referrer.includes("/register/supplier")) {
          setCompanyDetails((prev) => ({ ...prev, company_type: "buyer" }))
          setIsCompanyTypePreselected(true)
        }
      }
    } catch {
      // ignore errors and keep default "supplier"
    }
  }, [])

  // Prefill email from query string or localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const emailParam = params.get("email")
      if (emailParam) {
        setCompanyDetails((prev) => ({ ...prev, email: emailParam }))
        return
      }
      const stored = window.localStorage.getItem("prefill-email")
      if (stored) {
        setCompanyDetails((prev) => ({ ...prev, email: stored }))
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist email to localStorage when edited
  useEffect(() => {
    try {
      if (companyDetails.email && companyDetails.email.includes("@")) {
        window.localStorage.setItem("prefill-email", companyDetails.email)
      }
    } catch {
      // ignore
    }
  }, [companyDetails.email])

  // Enhanced progress calculation
  const calculateProgress = useCallback(() => {
    let progressValue = 0
    
    if (companyDetails.company_name && companyDetails.registration_number && companyDetails.tax_number) {
      progressValue += 25
    }
    
    const uploadedDocs = requiredDocuments.filter((doc) => doc.uploaded).length
    if (uploadedDocs > 0) {
      progressValue += Math.min(50, (uploadedDocs / requiredDocuments.length) * 50)
    }
    
    if (activeTab === "complete" || kycStatus === "approved") {
      progressValue = 100
    } else if (kycStatus === "under_review") {
      progressValue = 75
    }

    return Math.min(100, progressValue)
  }, [companyDetails, requiredDocuments, activeTab, kycStatus])

  // Update progress when data changes
  React.useEffect(() => {
    setProgress(calculateProgress())
  }, [calculateProgress])

  // Adjust required document list based on selected company type before uploads start
  React.useEffect(() => {
    setRequiredDocuments((prev) => {
      const anyUploaded = prev.some((d) => d.uploaded)
      if (anyUploaded) return prev
      return companyDetails.company_type === "supplier" ? SUPPLIER_DOCUMENTS : BUYER_DOCUMENTS
    })
  }, [companyDetails.company_type])

  // Form validation
  const validate = useCallback(() => {
    const errs: string[] = []
    
    companyFields.forEach(field => {
      if (field.required && !companyDetails[field.name as keyof CompanyDetails]) {
        errs.push(`${field.label} is required`)
      }
      if (field.name === "email" && companyDetails.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyDetails.email)) {
        errs.push("Valid email is required")
      }
    })
    
    return errs
  }, [companyDetails])

  // Handle form field changes
  const handleChange = useCallback((name: string, value: string) => {
    setCompanyDetails((prev) => ({ ...prev, [name]: value }))
    setErrors([])
  }, [])

  // Enhanced company details saving with proper auth handling
  const handleSaveCompanyDetails = useCallback(async () => {
    console.log("Starting to save company details:", companyDetails)

    const errs = validate()
    if (errs.length > 0) {
      console.log("Validation errors:", errs)
      setErrors(errs)
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting.",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      setErrors([])

      const companyData = {
        companyName: companyDetails.company_name.trim(),
        registrationNumber: companyDetails.registration_number.trim(),
        taxNumber: companyDetails.tax_number.trim(),
        email: companyDetails.email?.trim() || "",
        phone: companyDetails.phone?.trim() || "",
        address: companyDetails.address?.trim() || "",
        companyType: companyDetails.company_type,
      }

      console.log("Submitting company data:", companyData)

      const res = await fetch("/api/kyc/application", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Accept: "application/json" 
        },
        credentials: "include",
        body: JSON.stringify(companyData),
      })
      
      console.log('KYC API Response status:', res.status)
      
      let data: any = null
      const ct = res.headers.get("content-type") || ""
      if (ct.includes("application/json")) {
        try { 
          data = await res.json() 
          console.log('KYC API Response data:', data)
        } catch (parseError) { 
          console.error('Failed to parse response JSON:', parseError)
          data = null 
        }
      }

      // If API saved a draft (unauthenticated), proceed to documents without forcing account creation
      if (data && data.draft === true && data.authenticated === false) {
        if (data.companyId) setCompanyDetails((prev) => ({ ...prev, id: data.companyId }))
        if (data.kycId) setKycId(data.kycId)
        toast({
          title: "Draft saved",
          description: "You can now upload documents. You'll be asked to sign in when submitting.",
          duration: 4000,
        })
        setActiveTab("documents")
        return
      }

      if (!res.ok) {
        console.log(`API Error - Status: ${res.status}`)
        
        if (res.status === 401) {
          console.log('Unauthorized - user needs to login')
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          })
          localStorage.setItem('facility-form-data', JSON.stringify(companyDetails))
          setTimeout(() => {
            window.location.href = '/auth/login'
          }, 2000)
          return
        }
        
        if (data?.shouldLogin) {
          console.log('User should login')
          toast({
            title: "Account Found",
            description: "An account with this email already exists. Please log in to continue.",
            variant: "default",
          })
          
          localStorage.setItem('facility-form-data', JSON.stringify(companyDetails))
          setTimeout(() => {
            router.push(`/auth/login?email=${encodeURIComponent(companyDetails.email || "")}&returnTo=${encodeURIComponent('/facility-application')}`)
          }, 2000)
          return
          
        } else if (data?.shouldVerify) {
          console.log('User needs email verification')
          toast({
            title: "Email Verification Required",
            description: "Please check your email for the verification code to complete registration.",
            variant: "default",
          })
          
          setTimeout(() => {
            router.push(`/verify-otp?email=${encodeURIComponent(companyDetails.email || "")}&purpose=registration`)
          }, 2000)
          return
          
        } else if (data?.needsAuthentication) {
          console.log('User needs authentication')
          toast({
            title: "Account Required",
            description: "Please create an account to save your application data.",
            duration: 5000,
          })

          localStorage.setItem('facility-form-data', JSON.stringify(companyDetails))
          
          setTimeout(() => {
            const shouldRegister = confirm("Would you like to create an account now to continue with your application?")
            if (shouldRegister) {
              router.push(`/register?email=${encodeURIComponent(companyDetails.email || "")}&returnTo=${encodeURIComponent('/facility-application')}`)
            }
          }, 1000)
          return
          
        } else {
          const errorMsg = data?.error || data?.message || `HTTP ${res.status}: Failed to save application`
          console.error('API Error:', errorMsg)
          throw new Error(errorMsg)
        }
      }

      // Success case - user was authenticated
      console.log('Success response received')
      if (data && (data.authenticated || data.success || data.companyId || data.kycId)) {
        console.log('Setting company details and KYC ID')
        setCompanyDetails((prev) => ({ ...prev, id: data.companyId }))
        if (data.kycId) setKycId(data.kycId)

        toast({
          title: "Company Details Saved",
          description: "Your company information has been saved successfully.",
          duration: 4000,
        })

        setTimeout(() => {
          console.log('Advancing to documents tab')
          setActiveTab("documents")
        }, 1000)
      } else {
        console.log('Unexpected success response format:', data)
        toast({
          title: "Partial Success",
          description: "Details saved but response format unexpected. Please check your progress.",
          variant: "default",
        })
      }

    } catch (error) {
      console.error("Error saving company details:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save company details. Please try again."
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      })
      setErrors([errorMessage])
    } finally {
      setUploading(false)
    }
  }, [companyDetails, toast, validate, router])

  // Enhanced tab navigation with validation
  const handleTabChange = useCallback(
    (tab: ApplicationTab) => {
      // Validate tab access based on current state
      if (tab === "documents" && !companyDetails?.company_name?.trim()) {
        toast({
          title: "Complete Previous Step",
          description: "Please save your company details first",
          variant: "destructive",
        })
        return
      }

      setActiveTab(tab)
    },
    [companyDetails?.company_name, toast],
  )

  // Enhanced file upload validation
  const validateFile = useCallback((file: File): string | null => {
    console.log(`Validating file:`, {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    if (file.size > VALIDATION_RULES.MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxSizeMB = VALIDATION_RULES.MAX_FILE_SIZE / (1024 * 1024)
      return `File size is ${sizeMB}MB. Maximum allowed size is ${maxSizeMB}MB`
    }

    if (!file.name.includes('.')) {
      return "File must have a valid extension"
    }

    const fileExtension = ("." + file.name.split(".").pop()?.toLowerCase()) as string
    
    if (!VALIDATION_RULES.ALLOWED_EXTENSIONS.includes(fileExtension as any)) {
      return `File type "${fileExtension}" not supported. Please upload files in ${VALIDATION_RULES.ALLOWED_EXTENSIONS.join(", ")} format`
    }

    if (file.size === 0) {
      return "File appears to be empty. Please select a valid file"
    }

    return null
  }, [])

  // Document upload handler
  const handleSingleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, doc: KYCDocument, index: number) => {
      const file = e.target.files?.[0]
      if (!file) return

      const validationError = validateFile(file)
      if (validationError) {
        toast({
          title: "Invalid File",
          description: validationError,
          variant: "destructive",
        })
        return
      }

      if (!kycId) {
        toast({
          title: "KYC Required",
          description: "Please submit your company details first before uploading documents.",
          variant: "destructive",
        })
        return
      }

      setUploadingDocuments((prev) => ({ ...prev, [index]: true }))

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("documentType", doc.type)
        formData.append("kycId", kycId)

        const res = await fetch("/api/kyc/documents", {
          method: "POST",
          body: formData,
        })
        let uploadResponse: any = null
        const uct = res.headers.get("content-type") || ""
        if (uct.includes("application/json")) {
          try { uploadResponse = await res.json() } catch { uploadResponse = null }
        }
        if (!res.ok) {
          const serverMsg = uploadResponse?.error || uploadResponse?.message || `Failed to upload ${doc.name}`
          throw new Error(serverMsg)
        }

        setRequiredDocuments((prevDocs) =>
          prevDocs.map((d, i) => {
            if (i === index) {
              return {
                ...d,
                uploaded: true,
                uploadedAt: uploadResponse.document?.upload_date || new Date().toISOString(),
                status: uploadResponse.document?.status || "uploaded",
                filename: uploadResponse.document?.filename,
                original_filename: file.name,
                size: uploadResponse.document?.file_size ?? file.size,
              }
            }
            return d
          })
        )

        setDocumentUploads((prev) => ({ ...prev, [index]: file }))

        toast({
          title: "Document Uploaded",
          description: `${doc.name} uploaded successfully`,
          duration: 3000,
        })

        const updatedDocs = requiredDocuments.map((d, i) => (i === index ? { ...d, uploaded: true } : d))
        const allUploaded = updatedDocs.every((d) => d.uploaded)
        if (allUploaded) {
          toast({
            title: "All Documents Uploaded",
            description: "You can now submit your application",
            variant: "default",
          })
        }
      } catch (error) {
        console.error(`Error uploading ${doc.name}:`, error)
        
        const errorMessage = error instanceof Error ? error.message : `Failed to upload ${doc.name}. Please try again.`
        
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setUploadingDocuments((prev) => ({ ...prev, [index]: false }))
        e.target.value = ""
      }
    },
    [validateFile, toast, requiredDocuments, kycId],
  )

  // Complete application submission
  const handleCompleteSubmission = useCallback(async () => {
    const isSupplier = companyDetails.company_type === "supplier"
    const uploadedCount = requiredDocuments.filter((d) => d.uploaded).length
    const meetsRequirement = isSupplier ? uploadedCount >= 2 : requiredDocuments.every((d) => d.uploaded)
    if (!meetsRequirement) {
      toast({
        title: "Missing Documents",
        description: isSupplier
          ? "Please upload at least 2 required documents before continuing."
          : "Please upload all required documents before continuing.",
        variant: "destructive",
      })
      return
    }

    if (!kycId) {
      toast({ title: "Missing KYC", description: "KYC ID not found.", variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ kycId }),
      })
      let data: any = null
      const ct = res.headers.get("content-type") || ""
      if (ct.includes("application/json")) {
        try { data = await res.json() } catch { data = null }
      }
      if (res.status === 401 || res.redirected) {
        toast({ title: "Login required", description: "Please log in to submit your application.", variant: "destructive" })
        return
      }
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit application")
      }

      setSubmitted(true)
      toast({
        title: "Application Submitted",
        description: "Your facility application has been submitted successfully!",
        duration: 5000,
      })
      setKycStatus("under_review")
      setKycSubmitted(true)
      setActiveTab("complete")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Submission failed"
      toast({ title: "Submit Failed", description: msg, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }, [requiredDocuments, toast, kycId, companyDetails.company_type])

  // Show submitted state with original styling
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <Card className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl text-foreground">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-3">
                <LogoIcon className="w-8 h-8 text-blue-600" />
                <span className="font-bold">
                  Future | Finance Cashflow
                </span>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="p-4 bg-blue-600 rounded-full shadow-lg inline-block">
                <PartyPopper className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold">
              Application Submitted Successfully!
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Thank you for your facility application. Our team will review your submission and contact you soon.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4">
                What's Next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-muted-foreground">Your application is under review (24-48 hours)</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-muted-foreground">KYC documents will be verified</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-muted-foreground">Facility agreement will be prepared</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full max-w-xs font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main Application Interface with original styling
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white py-8 px-4">
      <Card className="w-full max-w-4xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden text-foreground">
        {/* Enhanced Header */}
        <CardHeader className="bg-card text-foreground p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-xl">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Facility Application
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Complete your onboarding process in three simple steps
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 border border-border transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
              <div className="h-6 w-px bg-border mx-1" />
              <LogoIcon className="w-8 h-8 text-blue-600" />
              <Badge variant="secondary" className="bg-muted text-foreground border border-border">
                {Math.round(progress)}% Complete
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Enhanced Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              Application Progress
            </span>
            <span className="text-sm font-semibold text-blue-600">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className="h-3 bg-muted rounded-full overflow-hidden" 
          />
        </div>

        {/* Enhanced Step Indicator */}
        <div className="px-6 py-6">
          <StepIndicator activeTab={activeTab} progress={progress} />
        </div>

        <Separator className="bg-border" />

        {/* Tab Content */}
        <CardContent className="p-6">
          
          {/* Company Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building className="h-12 w-12 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-bold">Company Information</h2>
                <p className="text-muted-foreground">Provide your company details to get started</p>
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1">
                      {errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {companyFields.map(field => (
                  <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                    <div className="space-y-2">
                      <Label id={`${field.name}-label`} htmlFor={field.name} className="text-sm font-semibold">
                        {field.label}{field.required && " *"}
                      </Label>
                      {field.name === "company_type" && isCompanyTypePreselected && (
                        <p className="text-xs text-primary/80 bg-primary/10 px-2 py-1 rounded-lg">
                          Automatically selected based on your registration path
                        </p>
                      )}
                      {field.type === "textarea" ? (
                        <Textarea
                          id={field.name}
                          name={field.name}
                          autoComplete={autoCompleteMap[field.name] || "off"}
                          placeholder={`Enter your ${field.label.toLowerCase()}`}
                          value={companyDetails[field.name as keyof CompanyDetails] || ""}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          disabled={uploading}
                          className="form-input min-h-[120px]"
                        />
                      ) : field.type === "select" && field.options ? (
                        <>
                        <input
                          type="hidden"
                          id={`${field.name}-value`}
                          name={field.name}
                          autoComplete={autoCompleteMap[field.name] || "off"}
                          value={(companyDetails[field.name as keyof CompanyDetails] as string) || ""}
                        />
                        <Select
                          value={companyDetails[field.name as keyof CompanyDetails] || ""}
                          onValueChange={(value) => handleChange(field.name, value)}
                          disabled={uploading || (field.name === "company_type" && isCompanyTypePreselected)}
                        >
                          <SelectTrigger 
                            id={field.name} 
                            aria-labelledby={field.name + "-label"} 
                            className={`form-input ${field.name === "company_type" && isCompanyTypePreselected ? "opacity-80 cursor-not-allowed" : ""}`}
                          >
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border shadow-2xl rounded-xl">
                            {field.options.map(option => (
                              <SelectItem key={option.value} value={option.value} className="focus:bg-muted">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        </>
                      ) : (
                        <Input
                          id={field.name}
                          name={field.name}
                          autoComplete={autoCompleteMap[field.name] || "off"}
                          type={field.type}
                          placeholder={`Enter your ${field.label.toLowerCase()}`}
                          value={companyDetails[field.name as keyof CompanyDetails] || ""}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          disabled={uploading}
                          className="form-input"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => { void handleSaveCompanyDetails() }}
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Details...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* KYC Documents Tab */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-bold">KYC Documentation</h2>
                <p className="text-muted-foreground">Upload required documents for verification</p>
              </div>

              <Alert className="border border-border bg-muted">
                <FileIcon className="h-4 w-4" />
                <AlertDescription className="text-muted-foreground">Please upload all required documents to complete your application.</AlertDescription>
              </Alert>

              {!kycId && (
                <Alert className="border border-border bg-muted">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-muted-foreground">
                    <strong>Action Required:</strong> Please submit your company details first before uploading documents.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                {requiredDocuments.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="bg-muted rounded-xl p-6 border border-border shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-6 w-6 text-primary" />
                        <div>
                          <span className="font-semibold text-lg">{doc.name}</span>
                          {doc.uploadedAt && (
                            <p className="text-sm text-primary/80 mt-1">
                              Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                            </p>
                          )}
                          {doc.original_filename && (
                            <p className="text-sm text-muted-foreground">
                              File: {doc.original_filename}
                            </p>
                          )}
                        </div>
                      </div>
                      {doc.uploaded && (
                        <Badge className="bg-blue-600 text-white border-0 shadow-sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Uploaded
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        {doc.uploaded ? (
                          <div className="flex items-center justify-between p-4 bg-green-600/10 border border-green-500/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="text-green-700 font-medium">
                                {doc.original_filename || `${doc.name} uploaded`}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // Reset the document
                                setRequiredDocuments(prev => 
                                  prev.map((d, i) => i === idx ? {...d, uploaded: false, uploadedAt: undefined, original_filename: undefined} : d)
                                );
                              }}
                              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              id={`file-${doc.type}`}
                              name={`file-${doc.type}`}
                              type="file"
                              autoComplete="off"
                              accept={VALIDATION_RULES.ALLOWED_EXTENSIONS.join(",")}
                              onChange={(e) => handleSingleFileUpload(e, doc, idx)}
                              disabled={uploadingDocuments[idx] || uploading || !kycId}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                            />
                            <div className={`
                              relative p-6 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer
                              ${!kycId || uploadingDocuments[idx] || uploading
                                ? 'border-border bg-muted/30 cursor-not-allowed opacity-50'
                                : 'border-border bg-muted hover:border-blue-600 hover:bg-blue-600/5'
                              }
                            `}>
                              <div className="flex flex-col items-center justify-center text-center">
                                {uploadingDocuments[idx] ? (
                                  <div className="flex items-center gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    <div className="text-left">
                                      <p className="font-medium">Uploading...</p>
                                      <p className="text-muted-foreground text-sm">Please wait while we process your document</p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="mb-3">
                                      <Upload className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium mb-1">
                                      Drop your file here or click to browse
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                      PDF, JPG, JPEG, PNG up to 10MB
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {doc.previewUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.previewUrl, "_blank")}
                          className="bg-card border border-border text-blue-600 hover:bg-muted hover:scale-105 transition-all duration-300 px-4 py-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted rounded-xl p-6 border border-border shadow-lg">
                <h4 className="font-semibold mb-3 text-lg">File Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Maximum file size: 10MB
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Accepted formats: PDF, JPG, JPEG, PNG
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Documents must be clear and legible
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    All information must be visible and unobscured
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => { void handleCompleteSubmission() }}
                disabled={
                  isSubmitting ||
                  !kycId ||
                  (companyDetails.company_type === "supplier"
                    ? requiredDocuments.filter((d) => d.uploaded).length < 2
                    : !requiredDocuments.every((d) => d.uploaded))
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    Submit Complete Application
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Complete Tab */}
          {activeTab === "complete" && (
            <div className="space-y-6 text-center">
              <div className="mb-6">
                <PartyPopper className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
                <p className="text-xl text-muted-foreground">Your facility application has been submitted successfully</p>
              </div>

              <div className="bg-muted rounded-xl p-6 border border-border">
                <h3 className="font-semibold mb-3 text-lg">Application Status</h3>
                <p className="text-muted-foreground mb-4">We're reviewing your documents. This typically takes 24-48 hours.</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    Start New Application
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    onClick={() => window.location.href = "/dashboard/supplier"}
                    variant="outline"
                    className="bg-card border border-border text-foreground font-semibold py-3 px-6 rounded-xl hover:bg-muted hover:scale-105 transition-all duration-300"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export { FacilityApplication }

export default function Page() {
  return <FacilityApplication />
}