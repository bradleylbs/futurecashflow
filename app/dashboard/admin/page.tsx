"use client"
import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, FileText, Clock, CheckCircle, AlertTriangle, Building,
  RefreshCw, BarChart3, TrendingUp, TrendingDown, Shield,
  Activity, LogOut, Bell, Settings, Zap, FileSpreadsheet,
  UserCog, ClipboardList, CreditCard, Menu, X, ChevronRight,
  Home, AlertCircle
} from "lucide-react";
import { AdminPaymentQueue } from "@/components/admin-payment-queue";
import { AdminApplicationsTable } from "@/components/admin-applications-table";
import { AdminDocumentsTable } from "@/components/admin-documents-table";
import { AdminBankingTable } from "@/components/admin-banking-table";
import AdminReports from "@/components/AdminReports";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminAuditLog from "@/components/AdminAuditLog";
import AdminMatchedInvoicesTable from "@/components/AdminMatchedInvoicesTable";

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

const NAV_SECTIONS = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    items: []
  },
  {
    id: "operations",
    title: "Operations",
    icon: Activity,
    items: [
      { id: "payments", label: "Payments", icon: Clock, description: "Review and process payments" },
      { id: "applications", label: "Applications", icon: Building, description: "Manage KYC applications" },
      { id: "matched_invoices", label: "Matched Invoices", icon: FileText, description: "View matched invoices" },
      { id: "banking", label: "Banking", icon: CreditCard, description: "Verify banking details" },
    ]
  },
  {
    id: "management",
    title: "Management",
    icon: UserCog,
    items: [
      { id: "users", label: "User Management", icon: UserCog, description: "Manage users and roles" },
    ]
  },
  {
    id: "audit",
    title: "Audit & Compliance",
    icon: Shield,
    items: [
      { id: "audit", label: "Audit Log", icon: ClipboardList, description: "System activity logs" },
    ]
  },
  {
    id: "reports",
    title: "Reports",
    icon: FileSpreadsheet,
    items: [
      { id: "reports", label: "Reports", icon: FileSpreadsheet, description: "Generate reports" },
    ]
  }
];

type StatsCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple';
  sparklineData?: number[];
};

const colorMap: Record<'blue' | 'green' | 'amber' | 'purple', { bg: string; border: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", icon: "text-green-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-500" },
};

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = "blue",
  sparklineData 
}) => {
  const colors = colorMap[color];
  
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
          {trend && trendValue && (
            <Badge 
              variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}
              className="gap-1"
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3" aria-hidden="true" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" aria-hidden="true" />}
              <span>{trendValue}</span>
              <span className="sr-only">
                {trend === 'up' ? 'Increased' : trend === 'down' ? 'Decreased' : 'Unchanged'} by {trendValue}
              </span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ViewSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

const SystemStatus: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
    <Activity className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-green-500`} aria-hidden="true" />
    <span className="text-muted-foreground">System OK</span>
    <span className="sr-only">All systems operational</span>
  </div>
);

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("operations");
  const lastRefresh = useRef<Date>(new Date());
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/applications?limit=1", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch statistics");
      const data = await res.json();
      setStats(data.stats);
      setError("");
      lastRefresh.current = new Date();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard statistics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh with visibility API
  const startAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }
    autoRefreshInterval.current = setInterval(fetchStats, 30000);
  }, [fetchStats]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else {
        fetchStats();
        startAutoRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startAutoRefresh();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAutoRefresh();
    };
  }, [fetchStats, startAutoRefresh, stopAutoRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    await fetchStats();
    setRefreshTrigger(p => p + 1);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    router.push("/auth/login");
  };

  const handleNavClick = (viewId: string, sectionId?: string) => {
    setActiveView(viewId);
    if (sectionId) setExpandedSection(sectionId);
    setSidebarOpen(false);
  };

  const currentSection = NAV_SECTIONS.find(s => 
    s.id === activeView || s.items.some(i => i.id === activeView)
  );
  const currentItem = currentSection?.items.find(i => i.id === activeView);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-blue-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-semibold">Loading Dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar Backdrop (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-72 bg-black/95 backdrop-blur-xl 
          border-r border-white/10 z-50 transform transition-transform duration-300 
          flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Admin Portal</h1>
                <p className="text-xs text-muted-foreground">Control Center</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Admin sections">
          {NAV_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSection === section.id;
            const isActive = activeView === section.id || section.items.some(i => i.id === activeView);

            if (section.items.length === 0) {
              // Dashboard - no children
              return (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-lg 
                    transition-all duration-200
                    ${activeView === section.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                    }
                  `}
                  aria-current={activeView === section.id ? 'page' : undefined}
                >
                  <SectionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="font-medium">{section.title}</span>
                </button>
              );
            }

            return (
              <div key={section.id}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? "" : section.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-2.5 rounded-lg 
                    transition-all duration-200
                    ${isActive ? 'text-white bg-white/5' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}
                  `}
                  aria-expanded={isExpanded}
                  aria-controls={`section-${section.id}`}
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="font-medium">{section.title}</span>
                  </div>
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {isExpanded && (
                  <div id={`section-${section.id}`} className="mt-1 ml-4 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isItemActive = activeView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id, section.id)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2 rounded-lg 
                            transition-all duration-200 group
                            ${isItemActive 
                              ? 'bg-blue-600 text-white' 
                              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                            }
                          `}
                          aria-current={isItemActive ? 'page' : undefined}
                        >
                          <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-xs opacity-70">{item.description}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <SystemStatus />
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/10">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Mobile Menu + Breadcrumb */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
                <span className="text-muted-foreground">Dashboard</span>
                {currentSection && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">{currentSection.title}</span>
                  </>
                )}
                {currentItem && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-white font-medium">{currentItem.label}</span>
                  </>
                )}
              </nav>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRefresh} 
                disabled={refreshing}
                size="sm"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                aria-label="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>

              <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-xs flex items-center justify-center">
                  3
                </span>
                <span className="sr-only">3 unread notifications</span>
              </Button>

              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Error Alert with Retry */}
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="ml-4"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Dashboard Stats - Only show on dashboard view */}
          {activeView === 'dashboard' && stats && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {lastRefresh.current.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatsCard 
                  title="Total Applications" 
                  value={stats.total_applications} 
                  subtitle={`${stats.suppliers} suppliers, ${stats.buyers} buyers`} 
                  icon={Users} 
                  color="blue" 
                  trend="up" 
                  trendValue="+12%" 
                />
                <StatsCard 
                  title="Pending Review" 
                  value={stats.pending + stats.under_review} 
                  subtitle={`${stats.pending} pending, ${stats.under_review} reviewing`} 
                  icon={Clock} 
                  color="amber" 
                  trend="down" 
                  trendValue="-8%" 
                />
                <StatsCard 
                  title="Ready for Decision" 
                  value={stats.ready_for_decision} 
                  subtitle="Awaiting approval" 
                  icon={AlertTriangle} 
                  color="purple" 
                  trend="neutral"
                />
                <StatsCard 
                  title="Completed" 
                  value={stats.approved + stats.rejected} 
                  subtitle={`${stats.approved} approved, ${stats.rejected} rejected`} 
                  icon={CheckCircle} 
                  color="green" 
                  trend="up" 
                  trendValue="+18%" 
                />
              </div>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    onClick={() => handleNavClick('payments', 'operations')}
                  >
                    <Clock className="h-5 w-5" />
                    <span className="text-sm">Process Payments</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    onClick={() => handleNavClick('applications', 'operations')}
                  >
                    <Building className="h-5 w-5" />
                    <span className="text-sm">Review Applications</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    onClick={() => handleNavClick('users', 'management')}
                  >
                    <UserCog className="h-5 w-5" />
                    <span className="text-sm">Manage Users</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    onClick={() => handleNavClick('reports', 'reports')}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="text-sm">Generate Reports</span>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Dynamic View Content */}
          {activeView !== 'dashboard' && (
            <Suspense fallback={<ViewSkeleton />}>
              <div className="space-y-4">
                {currentItem && (
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <currentItem.icon className="h-6 w-6 text-blue-500" />
                      {currentItem.label}
                    </h2>
                    {currentItem.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentItem.description}
                      </p>
                    )}
                  </div>
                )}

                {/* View-specific content without wrapper card */}
                {activeView === 'payments' && <AdminPaymentQueue tabActive={true} />}
                {activeView === 'applications' && <AdminApplicationsTable refreshTrigger={refreshTrigger} />}
                {activeView === 'matched_invoices' && <AdminMatchedInvoicesTable />}
                {activeView === 'banking' && <AdminBankingTable />}
                {activeView === 'users' && <AdminUserManagement />}
                {activeView === 'reports' && <AdminReports />}
                {activeView === 'audit' && <AdminAuditLog />}
              </div>
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}