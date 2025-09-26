"use client"
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  RefreshCw,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Link2,
  FileCheck2,
  TrendingUp,
  TrendingDown,
  Info,
  Shield,
  Activity,
  LogOut,
  Bell,
  Settings,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { AdminPaymentQueue } from "@/components/admin-payment-queue";
import { AdminApplicationsTable } from "@/components/admin-applications-table";
import { AdminDocumentsTable } from "@/components/admin-documents-table";
import { AdminBankingTable } from "@/components/admin-banking-table";

// Enhanced interfaces with better typing
interface AdminStats {
  total_applications: number;
  pending: number;
  under_review: number;
  ready_for_decision: number;
  approved: number;
  rejected: number;
  suppliers: number;
  buyers: number;
}

interface Analytics {
  documents: { total: number; verified: number; rejected: number; pending: number };
  invitations: { sent: number; opened: number; registered: number; completed: number; expired: number };
  pipeline: { pending: number; under_review: number; approved: number; rejected: number };
  agreements: { presented: number; signed: number };
  relationships: { relationships: number };
}

// Enhanced Stats Card Component with animations and accessibility
const StatsCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
  delay?: number;
  loading?: boolean;
}> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = "blue",
  delay = 0,
  loading = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  const colorClasses = {
    blue: "from-blue-500/10 to-indigo-500/10 border-blue-200/30 hover:border-blue-300/50",
    green: "from-green-500/10 to-emerald-500/10 border-green-200/30 hover:border-green-300/50",
    amber: "from-amber-500/10 to-orange-500/10 border-amber-200/30 hover:border-amber-300/50",
    purple: "from-purple-500/10 to-pink-500/10 border-purple-200/30 hover:border-purple-300/50",
    red: "from-red-500/10 to-rose-500/10 border-red-200/30 hover:border-red-300/50",
  };
  
  const iconColorClasses = {
    blue: "text-blue-600 bg-blue-100/50",
    green: "text-green-600 bg-green-100/50",
    amber: "text-amber-600 bg-amber-100/50",
    purple: "text-purple-600 bg-purple-100/50",
    red: "text-red-600 bg-red-100/50",
  };

  if (loading) {
    return (
      <Card className="bg-card border border-border/50">
        <CardHeader className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card 
      className={`
        relative overflow-hidden bg-gradient-to-br ${colorClasses[color]} 
        bg-card/80 backdrop-blur-sm border transition-all duration-500 
        hover:shadow-xl hover:scale-[1.02] cursor-pointer group
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
      role="article"
      aria-label={`${title}: ${value}`}
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {title}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="inline-flex"
                    aria-label={`Information about ${title}`}
                  >
                    <Info className="h-3 w-3 opacity-50 hover:opacity-100 transition-opacity" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">Real-time {title.toLowerCase()} metrics updated every 30 seconds</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <div className="text-3xl font-bold tabular-nums tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${iconColorClasses[color]} backdrop-blur-sm transition-transform group-hover:scale-110`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        {subtitle && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
            {trend && trendValue && (
              <div 
                className={`flex items-center gap-1 text-xs font-semibold ${
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}
                aria-label={`Trend: ${trend} ${trendValue}`}
              >
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend === 'down' ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Visual progress indicator */}
        <div className="mt-3" aria-hidden="true">
          <Progress 
            value={typeof value === 'number' ? Math.min((value / 200) * 100, 100) : 50} 
            className="h-1 bg-muted"
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Main Enhanced Dashboard Component
export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("applications");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lastRefresh = useRef<Date>(new Date());
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch dashboard data
  const fetchStats = useCallback(async () => {
    try {
      const [appsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/applications?limit=1", { credentials: "include" }),
        fetch("/api/admin/analytics", { credentials: "include" }),
      ]);

      if (!appsRes.ok) {
        const msg = await appsRes.text().catch(() => "");
        throw new Error(`Failed to fetch admin statistics (${appsRes.status}) ${msg}`);
      }

      const data = await appsRes.json();
      setStats(data.stats);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
      
      setError("");
      lastRefresh.current = new Date();
    } catch (error) {
      setError("Failed to load dashboard statistics. Please try again.");
      console.error("Fetch admin stats error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and auto-refresh setup
  useEffect(() => {
    fetchStats();
    
    // Set up auto-refresh every 30 seconds
    refreshInterval.current = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchStats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input
      }
      // Cmd/Ctrl + R for refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
      // Tab navigation with number keys
      if (e.key >= '1' && e.key <= '5' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const tabs = ['payments', 'applications', 'documents', 'banking', 'analytics'];
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          setActiveTab(tabs[index]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 500);
  }, [fetchStats]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/auth/login");
  };

  // Calculate percentage changes for trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { trend: 'neutral' as const, value: '0%' };
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
      value: `${Math.abs(change).toFixed(1)}%`
    };
  };

  if (isLoading) {
    return <EnhancedLoadingScreen />;
  }

  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-black text-white">
        {/* Enhanced animated background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        </div>

        {/* Enhanced Header with better navigation */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              {/* Left section - Logo and title */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Toggle menu"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Admin Dashboard
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {lastRefresh.current.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right section - Actions */}
              <div className="flex items-center space-x-3">
                {/* Quick stats */}
                <div className="hidden lg:flex items-center space-x-4 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">System Healthy</span>
                  </div>
                  <div className="h-4 w-px bg-white/20" />
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Auto-refresh: ON</span>
                  </div>
                </div>

                {/* Notifications */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full hover:bg-white/10"
                        aria-label={`${notifications} notifications`}
                      >
                        <Bell className="h-5 w-5" />
                        {notifications > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center">
                            {notifications}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{notifications} new notifications</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Settings */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-white/10"
                        aria-label="Settings"
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dashboard settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="h-8 w-px bg-white/20" />

                {/* Refresh button */}
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 shadow-lg hover:shadow-xl transition-all"
                  aria-label="Refresh dashboard"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </Button>

                {/* Logout */}
                <Button
                  onClick={handleLogout}
                  className="h-9 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-4"
                  aria-label="Logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8 space-y-8">
          {/* Page Header with breadcrumbs */}
          <div className="space-y-1">
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-white capitalize">{activeTab}</span>
            </nav>
            <p className="text-muted-foreground">
              Manage KYC applications, document reviews, and payment processing
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Enhanced Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Applications"
                value={stats.total_applications}
                subtitle={`${stats.suppliers} suppliers, ${stats.buyers} buyers`}
                icon={Users}
                color="blue"
                trend="up"
                trendValue="+12.5%"
                delay={0}
                loading={isLoading}
              />
              <StatsCard
                title="Pending Review"
                value={stats.pending + stats.under_review}
                subtitle={`${stats.pending} pending, ${stats.under_review} in review`}
                icon={Clock}
                color="amber"
                trend="down"
                trendValue="-8.3%"
                delay={100}
                loading={isLoading}
              />
              <StatsCard
                title="Ready for Decision"
                value={stats.ready_for_decision}
                subtitle="Awaiting final approval"
                icon={AlertTriangle}
                color="purple"
                trend="neutral"
                trendValue="0%"
                delay={200}
                loading={isLoading}
              />
              <StatsCard
                title="Completed"
                value={stats.approved + stats.rejected}
                subtitle={`${stats.approved} approved, ${stats.rejected} rejected`}
                icon={CheckCircle}
                color="green"
                trend="up"
                trendValue="+18.2%"
                delay={300}
                loading={isLoading}
              />
            </div>
          )}

          {/* Enhanced KPI Cards */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { 
                  title: "Documents", 
                  value: analytics.documents.total,
                  subtitle: `${analytics.documents.verified} verified, ${analytics.documents.pending} pending`,
                  icon: FileCheck2,
                  color: "blue" as const
                },
                { 
                  title: "Invitations", 
                  value: analytics.invitations.sent,
                  subtitle: `${analytics.invitations.completed} completed`,
                  icon: PieChartIcon,
                  color: "purple" as const
                },
                { 
                  title: "Agreements", 
                  value: analytics.agreements.signed,
                  subtitle: `${analytics.agreements.presented} presented`,
                  icon: FileText,
                  color: "blue" as const
                },
                { 
                  title: "Relationships", 
                  value: analytics.relationships.relationships,
                  subtitle: "buyer-supplier pairs",
                  icon: Link2,
                  color: "amber" as const
                },
                { 
                  title: "Pipeline", 
                  value: Object.values(analytics.pipeline).reduce((a, b) => a + b, 0),
                  subtitle: "total across stages",
                  icon: BarChartIcon,
                  color: "green" as const
                }
              ].map((item, index) => (
                <Card key={item.title} className="bg-card border border-border/50 hover:border-border transition-all hover:shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                    <item.icon className={`h-4 w-4 text-${item.color}-600`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold text-${item.color}-400`}>{item.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Enhanced Tabs with better visual hierarchy */}
          <Tabs 
            defaultValue={activeTab} 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="space-y-6"
          >
            <TabsList className="bg-white/5 backdrop-blur-sm p-1 rounded-2xl border border-white/10 grid grid-cols-5 w-full lg:w-auto lg:inline-grid">
              {[
                { value: "payments", label: "Payments", icon: Clock, badge: stats?.pending },
                { value: "applications", label: "Applications", icon: Building, badge: stats?.total_applications },
                { value: "documents", label: "Documents", icon: FileText, badge: analytics?.documents.pending },
                { value: "banking", label: "Banking", icon: CheckCircle },
                { value: "analytics", label: "Analytics", icon: BarChartIcon }
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground rounded-xl transition-all"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <Badge className="ml-2 h-5 px-1.5 text-xs">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="payments" className="space-y-4">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span>Payment Queue</span>
                  </CardTitle>
                  <CardDescription>Review, approve, and execute supplier payments</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <AdminPaymentQueue tabActive={activeTab === "payments"} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="applications" className="space-y-4">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-blue-600" />
                    <span>KYC Applications</span>
                  </CardTitle>
                  <CardDescription>Review and manage all KYC applications</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <AdminApplicationsTable refreshTrigger={refreshTrigger} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Document Review Queue</span>
                  </CardTitle>
                  <CardDescription>Review and verify submitted documents</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <AdminDocumentsTable refreshTrigger={refreshTrigger} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banking" className="space-y-4">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span>Banking Verification</span>
                  </CardTitle>
                  <CardDescription>Verify supplier banking details</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <AdminBankingTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <BarChartIcon className="h-5 w-5 text-blue-600" />
                    <span>Analytics Dashboard</span>
                  </CardTitle>
                  <CardDescription>Comprehensive analytics and insights</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <BarChartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">Analytics charts will be rendered here</p>
                    <p className="text-sm text-muted-foreground mt-2">Pipeline, invitation funnel, and trend analysis</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}

// Enhanced Loading Screen Component
function EnhancedLoadingScreen() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-[120px] animate-pulse" />
      </div>
      
      <div className="text-center">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo with professional animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-2xl animate-pulse" />
            <div className="relative p-6 rounded-full border border-border bg-card/50 backdrop-blur-sm">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          
          {/* Brand Name with gradient effect */}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Future Finance Cashflow
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Admin Dashboard</p>
          </div>
          
          {/* Enhanced loading indicator */}
          <div className="space-y-4">
            <div className="flex space-x-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            <Progress value={33} className="w-48" />
            <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    </div>
  );
}