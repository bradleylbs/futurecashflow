"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Invitation {
  id: string
  companyName: string
  email: string
  message?: string
  status: string
  expires_at?: string
}

export default function SupplierInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInvitations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/invitations")
      if (!response.ok) throw new Error("Failed to fetch invitations")
      const data = await response.json()
      setInvitations((data.invitations || []).filter((inv: Invitation) => ["sent", "opened"].includes(inv.status)))
      setError("")
    } catch (error) {
      setError("Failed to load invitations")
      console.error("Fetch invitations error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchInvitations() }, [])

  const handleAccept = async (invitationId: string) => {
    setActionLoading(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to accept invitation")
      }
      await fetchInvitations()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to accept invitation")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (invitationId: string) => {
    if (!confirm("Are you sure you want to reject this invitation?")) return
    setActionLoading(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to reject invitation")
      }
      await fetchInvitations()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to reject invitation")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Pending Invitations</h2>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
          ) : invitations.length === 0 ? (
            <TableRow><TableCell colSpan={6}>No pending invitations</TableCell></TableRow>
          ) : invitations.map(inv => (
            <TableRow key={inv.id}>
              <TableCell>{inv.companyName}</TableCell>
              <TableCell>{inv.email}</TableCell>
              <TableCell>{inv.message || "-"}</TableCell>
              <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
              <TableCell>{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "-"}</TableCell>
              <TableCell>
                <Button size="sm" disabled={actionLoading === inv.id} onClick={() => handleAccept(inv.id)} variant="default">Accept</Button>
                <Button size="sm" disabled={actionLoading === inv.id} onClick={() => handleReject(inv.id)} variant="destructive" className="ml-2">Reject</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
