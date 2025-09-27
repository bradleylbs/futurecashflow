"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Download, 
  AlertCircle, 
  RefreshCw, 
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  BarChart3
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface ReportsOverview {
  offers_accepted: number
  fees_total: number
  kyc_pending: number
  total_applications: number
  active_suppliers: number
  active_buyers: number
  payments_processed: number
  total_volume: number
}

interface DateRange {
  from: string
  to: string
}

type ReportType = 'offers' | 'compliance' | 'applications' | 'payments'

// ============================================================================
// Constants
// ============================================================================

const QUICK_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'mtd', label: 'Month to Date' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
]

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ElementType }[] = [
  { value: 'offers', label: 'Offers Report', icon: TrendingUp },
  { value: 'compliance', label: 'Compliance Report', icon: CheckCircle2 },
  { value: 'applications', label: 'Applications Report', icon: FileText },
  { value: 'payments', label: 'Payments Report', icon: DollarSign },
]

// ============================================================================
// Utility Functions
// ============================================================================

const getQuickRangeDates = (range: string): DateRange => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (range) {
    case 'today':
      return {
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      }
    case '7d':
      const last7Days = new Date(today)
      last7Days.setDate(last7Days.getDate() - 7)
      return {
        from: last7Days.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      }
    case '30d':
      const last30Days = new Date(today)
      last30Days.setDate(last30Days.getDate() - 30)
      return {
        from: last30Days.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      }
    case 'mtd':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        from: monthStart.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      }
    case 'ytd':
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return {
        from: yearStart.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      }
    default:
      return { from: '', to: '' }
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount)
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  trend?: string
}

const colorMap: Record<'blue' | 'green' | 'amber' | 'red' | 'purple', { bg: string; border: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-500" },
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "blue",
  trend
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
        <div className="flex items-center justify-between">
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <Badge variant="outline" className="ml-2">
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(8)].map((_, i) => (
      <Skeleton key={i} className="h-32 w-full" />
    ))}
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

export default function AdminReports() {
  const { toast } = useToast()
  
  const [overview, setOverview] = useState<ReportsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [quickRange, setQuickRange] = useState("30d")
  const [dateRange, setDateRange] = useState<DateRange>(() => getQuickRangeDates('30d'))
  const [exporting, setExporting] = useState<ReportType | null>(null)

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams()
      if (dateRange.from) params.append('from', dateRange.from)
      if (dateRange.to) params.append('to', dateRange.to)

      const response = await fetch(`/api/admin/reports/overview?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to fetch reports overview')

      const data = await response.json()
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  // Handle quick range selection
  const handleQuickRangeChange = (value: string) => {
    setQuickRange(value)
    if (value !== 'custom') {
      const dates = getQuickRangeDates(value)
      setDateRange(dates)
    }
  }

  // Handle custom date change
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setQuickRange('custom')
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  // Export report
  const handleExport = async (type: ReportType) => {
    try {
      setExporting(type)

      const params = new URLSearchParams()
      if (dateRange.from) params.append('from', dateRange.from)
      if (dateRange.to) params.append('to', dateRange.to)

      const response = await fetch(`/api/admin/reports/${type}.csv?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${dateRange.from}-to-${dateRange.to}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export Successful",
        description: `${type} report has been downloaded`,
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err instanceof Error ? err.message : 'Failed to export report',
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Date Range
          </CardTitle>
          <CardDescription>
            Select a date range for your reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={quickRange} onValueChange={handleQuickRangeChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {QUICK_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-1">
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="flex-1"
                aria-label="From date"
              />
              <span className="flex items-center text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="flex-1"
                aria-label="To date"
              />
            </div>

            <Button
              onClick={fetchOverview}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      {loading ? (
        <LoadingSkeleton />
      ) : overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Offers Accepted" 
            value={overview.offers_accepted}
            subtitle="Total accepted offers"
            icon={TrendingUp}
            color="green"
          />
          <StatsCard 
            title="Total Fees" 
            value={formatCurrency(overview.fees_total)}
            subtitle="Revenue generated"
            icon={DollarSign}
            color="blue"
          />
          <StatsCard 
            title="KYC Pending" 
            value={overview.kyc_pending}
            subtitle="Awaiting verification"
            icon={Clock}
            color="amber"
          />
          <StatsCard 
            title="Total Applications" 
            value={overview.total_applications}
            subtitle="All submissions"
            icon={FileText}
            color="purple"
          />
          <StatsCard 
            title="Active Suppliers" 
            value={overview.active_suppliers}
            subtitle="Registered suppliers"
            icon={Users}
            color="blue"
          />
          <StatsCard 
            title="Active Buyers" 
            value={overview.active_buyers}
            subtitle="Registered buyers"
            icon={Users}
            color="green"
          />
          <StatsCard 
            title="Payments Processed" 
            value={overview.payments_processed}
            subtitle="Total transactions"
            icon={CheckCircle2}
            color="green"
          />
          <StatsCard 
            title="Transaction Volume" 
            value={formatCurrency(overview.total_volume)}
            subtitle="Total value processed"
            icon={BarChart3}
            color="purple"
          />
        </div>
      ) : null}

      {/* Export Reports */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500" />
            Export Reports
          </CardTitle>
          <CardDescription>
            Download detailed reports in CSV format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REPORT_TYPES.map(report => {
              const Icon = report.icon
              return (
                <Button
                  key={report.value}
                  onClick={() => handleExport(report.value)}
                  disabled={exporting === report.value}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                >
                  {exporting === report.value ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  <span className="text-sm">{report.label}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Reports are generated based on the selected date range. Exported files include detailed 
          transaction information and can be used for compliance and auditing purposes.
        </AlertDescription>
      </Alert>
    </div>
  )
}