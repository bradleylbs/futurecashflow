// ============================================================================
// invitations-table.tsx - Refactored
// ============================================================================

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  MoreHorizontal, 
  RefreshCw, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  UserPlus, 
  Calendar,
  Search,
  AlertCircle,
  Send
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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

interface StatsCardProps {
  title: string
  value: number
  icon: React.ElementType
  color?: 'blue' | 'green' | 'amber' | 'red'
}

const colorMap: Record<'blue' | 'green' | 'amber' | 'red', { bg: string; border: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-500" },
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color = "blue" }) => {
  const colors = colorMap[color]
  
  return (
    <Card className={`${colors.bg} border ${colors.border}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colors.icon}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
)

const EmptyState = () => (
  <div className="text-center py-12">
    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
    <h3 className="text-lg font-semibold mb-2">No Invitations Sent</h3>
    <p className="text-sm text-muted-foreground">
      Start by inviting suppliers to join your network
    </p>
  </div>
)

export function InvitationsTable({ refreshTrigger }: InvitationsTableProps) {
  const { toast } = useToast()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'resend' | 'cancel'
    invitation: Invitation
  } | null>(null)

  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      
      const response = await fetch("/api/invitations")

      if (!response.ok) {
        throw new Error("Failed to fetch invitations")
      }

      const data = await response.json()
      const list = data.invitations || []
      setInvitations(list)
      setFilteredInvitations(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitations")
      setInvitations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations, refreshTrigger])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = invitations.filter(inv => 
        inv.invited_company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invited_email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredInvitations(filtered)
    } else {
      setFilteredInvitations(invitations)
    }
  }, [searchQuery, invitations])

  const handleResendInvitation = async (invitationId: string) => {
    setActionLoading(invitationId)
    setConfirmAction(null)
    
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to resend invitation")
      }

      toast({
        title: "Invitation Resent",
        description: "The invitation has been sent again successfully",
      })

      await fetchInvitations()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: err instanceof Error ? err.message : "Failed to resend invitation",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    setActionLoading(invitationId)
    setConfirmAction(null)
    
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel invitation")
      }

      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled successfully",
      })

      await fetchInvitations()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Cancel Failed",
        description: err instanceof Error ? err.message : "Failed to cancel invitation",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date()
    const actualStatus = isExpired && status !== "completed" && status !== "cancelled" ? "expired" : status

    const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      sent: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Mail, label: "Sent" },
      opened: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock, label: "Opened" },
      registered: { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: UserPlus, label: "Registered" },
      completed: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle, label: "Completed" },
      expired: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: Calendar, label: "Expired" },
      cancelled: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: XCircle, label: "Cancelled" },
    }

    const config = statusConfig[actualStatus] || statusConfig.sent
    const Icon = config.icon

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const canResend = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date()
    return status !== "completed" && status !== "cancelled" && (isExpired || status === "sent")
  }

  const canCancel = (status: string) => {
    return status !== "completed" && status !== "cancelled"
  }

  // Calculate stats
  const stats = {
    total: invitations.length,
    completed: invitations.filter(i => i.current_status === 'completed').length,
    pending: invitations.filter(i => ['sent', 'opened', 'registered'].includes(i.current_status)).length,
    expired: invitations.filter(i => {
      const isExpired = new Date(i.expires_at) < new Date()
      return isExpired && i.current_status !== 'completed' && i.current_status !== 'cancelled'
    }).length,
  }

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Invitations" value={stats.total} icon={Mail} color="blue" />
        <StatsCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" />
        <StatsCard title="Pending" value={stats.pending} icon={Clock} color="amber" />
        <StatsCard title="Expired" value={stats.expired} icon={Calendar} color="red" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      {invitations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Invitations Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Supplier Invitations</CardTitle>
          <CardDescription>
            Showing {filteredInvitations.length} of {invitations.length} invitations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInvitations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.map((invitation) => (
                    <TableRow key={invitation.id} className="hover:bg-white/5">
                      <TableCell className="font-medium">{invitation.invited_company_name}</TableCell>
                      <TableCell>{invitation.invited_email}</TableCell>
                      <TableCell>{getStatusBadge(invitation.current_status, invitation.expires_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(invitation.sent_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(invitation.expires_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {canResend(invitation.current_status, invitation.expires_at) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'resend', invitation })}
                              disabled={actionLoading === invitation.id}
                            >
                              {actionLoading === invitation.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {canCancel(invitation.current_status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'cancel', invitation })}
                              disabled={actionLoading === invitation.id}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'resend' ? 'Resend Invitation' : 'Cancel Invitation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'resend' 
                ? `Are you sure you want to resend the invitation to ${confirmAction.invitation.invited_company_name}?`
                : `Are you sure you want to cancel the invitation to ${confirmAction?.invitation.invited_company_name}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction?.type === 'resend') {
                  handleResendInvitation(confirmAction.invitation.id)
                } else if (confirmAction?.type === 'cancel') {
                  handleCancelInvitation(confirmAction.invitation.id)
                }
              }}
              className={confirmAction?.type === 'cancel' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmAction?.type === 'resend' ? 'Resend' : 'Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

