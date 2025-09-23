"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Mail } from "lucide-react"

interface InviteSupplierDialogProps {
  onInviteSent?: () => void
}

export function InviteSupplierDialog({ onInviteSent }: InviteSupplierDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    message: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [secureCode, setSecureCode] = useState<string | null>(null)
  const [signupUrl, setSignupUrl] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.companyName || !formData.email) {
      setError("Company name and email are required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

  const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to send invitation")
        return
      }

  setSuccess(true)
  setSecureCode(data?.secureCode || null)
  setSignupUrl(data?.signupUrl || null)
      setFormData({ companyName: "", email: "", message: "" })

      // Close dialog after short delay
      setTimeout(() => {
  setOpen(false)
        setSuccess(false)
  setSecureCode(null)
  setSignupUrl(null)
        onInviteSent?.()
      }, 2000)
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when closing
      setFormData({ companyName: "", email: "", message: "" })
      setError("")
      setSuccess(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Invite Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border border-border shadow-sm rounded-2xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            Invite New Supplier
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Send an invitation to a supplier to join your network on the KYC platform.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-xl shadow-inner">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-200 shadow-lg">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-3">
              Invitation Sent!
            </h3>
            <p className="text-blue-700 text-center font-medium leading-relaxed">
              The supplier will receive an email with registration instructions.
            </p>
            {(secureCode || signupUrl) && (
              <div className="mt-6 w-full rounded-xl border-0 p-4 text-sm bg-white/70 backdrop-blur-sm shadow-lg">
                {secureCode && (
                  <div className="mb-2">
                    <span className="text-gray-700 font-medium">Secure Code:</span>{" "}
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{secureCode}</span>
                  </div>
                )}
                {signupUrl && (
                  <div className="truncate">
                    <span className="text-gray-700 font-medium">Signup Link:</span>{" "}
                    <a 
                      href={signupUrl} 
                      className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors duration-200" 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      {signupUrl}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-xl">
                <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label htmlFor="companyName" className="font-semibold">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Enter supplier company name"
                required
                className="form-input"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="font-semibold">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter supplier email address"
                required
                className="form-input"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="message" className="font-semibold">
                Personal Message (Optional)
              </Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Add a personal message to the invitation..."
                rows={3}
                className="form-input resize-none"
              />
            </div>

            <DialogFooter className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="border-border bg-muted text-foreground hover:bg-gray-100 rounded-xl px-6 py-3 font-medium"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
