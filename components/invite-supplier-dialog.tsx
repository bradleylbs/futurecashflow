// ============================================================================
// invite-supplier-dialog.tsx - Refactored
// ============================================================================

"use client"

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
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Mail, CheckCircle, Copy, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface InviteSupplierDialogProps {
  onInviteSent?: () => void
}

export function InviteSupplierDialog({ onInviteSent }: InviteSupplierDialogProps) {
  const { toast } = useToast()
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation")
      }

      setSuccess(true)
      setSecureCode(data?.secureCode || null)
      setSignupUrl(data?.signupUrl || null)
      
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${formData.companyName}`,
      })

      onInviteSent?.()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error. Please try again."
      setError(errorMsg)
      toast({
        variant: "destructive",
        title: "Failed to Send",
        description: errorMsg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset after close
      setTimeout(() => {
        setFormData({ companyName: "", email: "", message: "" })
        setError("")
        setSuccess(false)
        setSecureCode(null)
        setSignupUrl(null)
      }, 200)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Invite Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Invite New Supplier
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a supplier to join your network
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Invitation Sent!</h3>
              <p className="text-sm text-muted-foreground">
                The supplier will receive an email with registration instructions
              </p>
            </div>

            {(secureCode || signupUrl) && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                {secureCode && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Secure Code</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-sm flex-1">
                        {secureCode}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(secureCode, 'Secure code')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {signupUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Signup Link</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={signupUrl}
                        readOnly
                        className="text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(signupUrl, 'Signup link')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={() => handleOpenChange(false)} 
              className="w-full"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Enter supplier company name"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
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
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Add a personal message to the invitation..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
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