"use client"

import { useEffect, useState, useCallback } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
  Search, 
  AlertCircle, 
  RefreshCw, 
  Users,
  UserCheck,
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Ban,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface User {
  id: string
  email: string
  role: 'supplier' | 'buyer' | 'admin' | 'fm_admin' | 'fa_admin'
  account_status: 'active' | 'suspended' | 'pending'
  created_at: string
  last_login?: string
  company_name?: string
}

interface UsersResponse {
  items: User[]
  total: number
  page: number
  limit: number
  stats?: {
    total_users: number
    active_users: number
    suspended_users: number
    admin_users: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const ROLE_COLORS: Record<User['role'], string> = {
  'admin': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'fm_admin': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'fa_admin': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  'buyer': 'bg-green-500/10 text-green-500 border-green-500/20',
  'supplier': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

const STATUS_COLORS: Record<User['account_status'], string> = {
  'active': 'bg-green-500/10 text-green-500 border-green-500/20',
  'suspended': 'bg-red-500/10 text-red-500 border-red-500/20',
  'pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color?: 'blue' | 'green' | 'amber' | 'red'
}

const colorMap: Record<'blue' | 'green' | 'amber' | 'red', { bg: string; border: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-500" },
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "blue"
}) => {
  const colors = colorMap[color]
  
  return (
    <Card className={`${colors.bg} border ${colors.border} transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-3xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${colors.bg} border ${colors.border}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      </CardHeader>
      <CardContent>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
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
    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
    <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
    <p className="text-sm text-muted-foreground">
      Try adjusting your search or filter criteria
    </p>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

export default function AdminUserManagement() {
  const { toast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [stats, setStats] = useState<UsersResponse['stats']>()
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'reset-password'
    user: User
  } | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        q: debouncedQuery,
        page: page.toString(),
        limit: limit.toString(),
      })

      if (roleFilter !== 'all') params.append('role', roleFilter)

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to fetch users')

      const data: UsersResponse = await response.json()
      setUsers(data.items || [])
      setTotal(data.total || 0)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, page, limit, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Change user role
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) throw new Error('Failed to update role')

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as User['role'] } : u))
      
      toast({
        title: "Role Updated",
        description: `User role has been changed to ${newRole}`,
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update role',
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Toggle user status
  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    
    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ account_status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')

      setUsers(users.map(u => u.id === userId ? { ...u, account_status: newStatus as User['account_status'] } : u))
      
      toast({
        title: "Status Updated",
        description: `User has been ${newStatus === 'active' ? 'activated' : 'suspended'}`,
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update status',
      })
    } finally {
      setActionLoading(null)
      setConfirmAction(null)
    }
  }

  // Reset password
  const handleResetPassword = async (userId: string) => {
    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to reset password')

      toast({
        title: "Password Reset",
        description: "Password reset email has been sent to the user",
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to reset password',
      })
    } finally {
      setActionLoading(null)
      setConfirmAction(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Users" 
          value={stats?.total_users || 0}
          subtitle="All registered users"
          icon={Users}
          color="blue"
        />
        <StatsCard 
          title="Active Users" 
          value={stats?.active_users || 0}
          subtitle="Currently active"
          icon={UserCheck}
          color="green"
        />
        <StatsCard 
          title="Suspended" 
          value={stats?.suspended_users || 0}
          subtitle="Account suspended"
          icon={UserX}
          color="red"
        />
        <StatsCard 
          title="Administrators" 
          value={stats?.admin_users || 0}
          subtitle="Admin accounts"
          icon={Shield}
          color="amber"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search users"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by role">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="supplier">Supplier</SelectItem>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="fm_admin">FM Admin</SelectItem>
              <SelectItem value="fa_admin">FA Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={fetchUsers}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Users Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Showing {users.length} of {total} users
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : users.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-white/5">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.email}</span>
                            <span className="text-xs text-muted-foreground">
                              ID: {user.id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Select 
                            value={user.role} 
                            onValueChange={(value) => handleChangeRole(user.id, value)}
                            disabled={actionLoading === user.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="supplier">Supplier</SelectItem>
                              <SelectItem value="buyer">Buyer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="fm_admin">FM Admin</SelectItem>
                              <SelectItem value="fa_admin">FA Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={STATUS_COLORS[user.account_status]}
                          >
                            {user.account_status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {user.company_name || '-'}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                              disabled={actionLoading === user.id}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmAction({ type: user.account_status === 'active' ? 'suspend' : 'activate', user })}
                              disabled={actionLoading === user.id}
                            >
                              {user.account_status === 'active' ? (
                                <Ban className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'reset-password', user })}
                              disabled={actionLoading === user.id}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information for this user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="text-sm mt-1 font-mono">{selectedUser.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={ROLE_COLORS[selectedUser.role]}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={STATUS_COLORS[selectedUser.account_status]}>
                      {selectedUser.account_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedUser.last_login && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                    <p className="text-sm mt-1">
                      {new Date(selectedUser.last_login).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedUser.company_name && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                    <p className="text-sm mt-1">{selectedUser.company_name}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'suspend' && 'Suspend User'}
              {confirmAction?.type === 'activate' && 'Activate User'}
              {confirmAction?.type === 'reset-password' && 'Reset Password'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'suspend' && 
                `Are you sure you want to suspend ${confirmAction.user.email}? They will lose access to their account.`
              }
              {confirmAction?.type === 'activate' && 
                `Are you sure you want to activate ${confirmAction.user.email}? They will regain access to their account.`
              }
              {confirmAction?.type === 'reset-password' && 
                `Are you sure you want to reset the password for ${confirmAction.user.email}? A password reset email will be sent.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return
                if (confirmAction.type === 'reset-password') {
                  handleResetPassword(confirmAction.user.id)
                } else {
                  handleToggleStatus(confirmAction.user.id, confirmAction.user.account_status)
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}