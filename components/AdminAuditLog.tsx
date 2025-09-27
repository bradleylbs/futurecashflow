"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
} from "@/components/ui/dialog"
import { 
  Search, 
  Download, 
  AlertCircle, 
  RefreshCw, 
  Shield,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  Check,
  Activity,
  UserX,
  AlertTriangle,
  TrendingUp
} from "lucide-react"

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface AuditLogEntry {
  id: string
  created_at: string
  actor_email: string
  action: string
  target_type: string
  target_id: string
  metadata: Record<string, any>
  ip_address: string
  user_agent?: string
  severity?: 'info' | 'warning' | 'critical'
}

interface AuditLogResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  stats?: {
    today_count: number
    failed_logins: number
    critical_events: number
    admin_actions: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const ACTION_COLORS: Record<string, string> = {
  'create': 'bg-green-500/10 text-green-500 border-green-500/20',
  'update': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'delete': 'bg-red-500/10 text-red-500 border-red-500/20',
  'approve': 'bg-green-500/10 text-green-500 border-green-500/20',
  'reject': 'bg-red-500/10 text-red-500 border-red-500/20',
  'login': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'logout': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'export': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'failed': 'bg-red-500/10 text-red-500 border-red-500/20',
}

const TIME_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
]

// ============================================================================
// Utility Functions
// ============================================================================

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const getActionColor = (action: string): string => {
  const lowerAction = action.toLowerCase()
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (lowerAction.includes(key)) return color
  }
  return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
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

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-6 px-2"
      aria-label={`Copy ${text}`}
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
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
    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
    <h3 className="text-lg font-semibold mb-2">No Audit Logs Found</h3>
    <p className="text-sm text-muted-foreground">
      Try adjusting your search or filter criteria
    </p>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState<AuditLogResponse['stats']>()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        q: debouncedQuery,
        page: page.toString(),
        limit: limit.toString(),
      })

      if (actionFilter !== 'all') params.append('action', actionFilter)
      if (timeFilter !== 'all') params.append('time', timeFilter)

      const response = await fetch(`/api/admin/audit?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to fetch audit logs')

      const data: AuditLogResponse = await response.json()
      setEntries(data.logs || [])
      setTotal(data.total || 0)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, page, limit, actionFilter, timeFilter])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  // Export handler
  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/admin/audit/export', {
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to export audit logs')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const uniqueActions = useMemo(() => {
    const actions = new Set(entries.map(e => e.action))
    return Array.from(actions).sort()
  }, [entries])

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Today's Activity" 
          value={stats?.today_count || 0}
          subtitle="Events logged today"
          icon={Activity}
          color="blue"
        />
        <StatsCard 
          title="Failed Logins" 
          value={stats?.failed_logins || 0}
          subtitle="Authentication failures"
          icon={UserX}
          color="red"
        />
        <StatsCard 
          title="Critical Events" 
          value={stats?.critical_events || 0}
          subtitle="High priority actions"
          icon={AlertTriangle}
          color="amber"
        />
        <StatsCard 
          title="Admin Actions" 
          value={stats?.admin_actions || 0}
          subtitle="Administrative changes"
          icon={Shield}
          color="green"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Compact Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search audit logs"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by action">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by time">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_FILTERS.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={fetchAuditLogs}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={exporting}
            className="flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Showing {entries.length} of {total} entries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="w-[120px]">IP Address</TableHead>
                      <TableHead className="w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-white/5">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {formatRelativeTime(entry.created_at)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm">{entry.actor_email}</span>
                        </TableCell>

                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getActionColor(entry.action)}
                          >
                            {entry.action}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-mono">
                                {entry.target_type}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                                {entry.target_id}
                              </span>
                            </div>
                            <CopyButton text={entry.target_id} />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono">
                              {entry.ip_address}
                            </span>
                            <CopyButton text={entry.ip_address} />
                          </div>
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information for this audit entry
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Timestamp
                  </label>
                  <p className="text-sm mt-1">
                    {new Date(selectedEntry.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Actor
                  </label>
                  <p className="text-sm mt-1">{selectedEntry.actor_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Action
                  </label>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={getActionColor(selectedEntry.action)}
                    >
                      {selectedEntry.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Target Type
                  </label>
                  <p className="text-sm mt-1 font-mono">{selectedEntry.target_type}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Target ID
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-mono flex-1 break-all">{selectedEntry.target_id}</p>
                    <CopyButton text={selectedEntry.target_id} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    IP Address
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-mono">{selectedEntry.ip_address}</p>
                    <CopyButton text={selectedEntry.ip_address} />
                  </div>
                </div>
                {selectedEntry.user_agent && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      User Agent
                    </label>
                    <p className="text-xs mt-1 font-mono text-muted-foreground break-all">
                      {selectedEntry.user_agent}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Metadata
                </label>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedEntry.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}