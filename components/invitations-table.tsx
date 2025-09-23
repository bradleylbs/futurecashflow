"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MoreHorizontal, RefreshCw, Trash2, Clock, CheckCircle, XCircle, Mail, UserPlus, Calendar } from "lucide-react"

interface Invitation {
  id: string
  invited_company_name: string
  invited_email: string
  invitation_message?: string
  status: string
  current_status: string
  expires_at: string
  sent_at: string
  opened_at?: string
  registered_at?: string
  completed_at?: string
  email_delivery_status: string
  supplier_user_id?: string
}

interface InvitationsTableProps {
  refreshTrigger?: number
}

export function InvitationsTable({ refreshTrigger }: InvitationsTableProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInvitations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/invitations")

      if (!response.ok) {
        throw new Error("Failed to fetch invitations")
      }

      const data = await response.json()
      setInvitations(data.invitations || [])
      setError("")
    } catch (error) {
      setError("Failed to load invitations")
      console.error("Fetch invitations error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [refreshTrigger])

  const handleResendInvitation = async (invitationId: string) => {
    setActionLoading(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "resend" }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to resend invitation")
      }

      await fetchInvitations() // Refresh the list
    } catch (error) {
      console.error("Resend invitation error:", error)
      setError(error instanceof Error ? error.message : "Failed to resend invitation")
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) {
      return
    }

    setActionLoading(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel invitation")
      }

      await fetchInvitations() // Refresh the list
    } catch (error) {
      console.error("Cancel invitation error:", error)
      setError(error instanceof Error ? error.message : "Failed to cancel invitation")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date()
    const actualStatus = isExpired && status !== "completed" && status !== "cancelled" ? "expired" : status

    const statusConfig = {
      sent: { variant: "secondary" as const, icon: Mail, label: "Sent" },
      opened: { variant: "default" as const, icon: Clock, label: "Opened" },
      registered: { variant: "default" as const, icon: UserPlus, label: "Registered" },
      completed: { variant: "default" as const, icon: CheckCircle, label: "Completed" },
      expired: { variant: "destructive" as const, icon: Calendar, label: "Expired" },
      cancelled: { variant: "outline" as const, icon: XCircle, label: "Cancelled" },
    }

    const config = statusConfig[actualStatus as keyof typeof statusConfig] || statusConfig.sent
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const canResend = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date()
    return status !== "completed" && status !== "cancelled" && (isExpired || status === "sent")
  }

  const canCancel = (status: string) => {
    return status !== "completed" && status !== "cancelled"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading invitations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {invitations.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations sent yet</h3>
          <p className="text-gray-600">Start by inviting suppliers to join your network.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.invited_company_name}</TableCell>
                  <TableCell>{invitation.invited_email}</TableCell>
                  <TableCell>{getStatusBadge(invitation.current_status, invitation.expires_at)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(invitation.sent_at)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(invitation.expires_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={actionLoading === invitation.id}>
                          {actionLoading === invitation.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canResend(invitation.current_status, invitation.expires_at) && (
                          <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Resend Invitation
                          </DropdownMenuItem>
                        )}
                        {/* Removed inline 'Add Vendor Number' action in favor of the new Assign Vendors flow */}
                        {canCancel(invitation.current_status) && (
                          <DropdownMenuItem
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel Invitation
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
    </div>
  )
}
