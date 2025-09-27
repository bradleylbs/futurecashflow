"use client"
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Clock, CheckCircle, AlertTriangle, Building,
  RefreshCw, BarChart3, TrendingUp, TrendingDown, Shield,
  Activity, LogOut, Bell, Settings, Zap, FileSpreadsheet,
  UserCog, ClipboardList, Gauge, ChevronDown, CreditCard
} from "lucide-react";
import { AdminPaymentQueue } from "@/components/admin-payment-queue";
import { AdminApplicationsTable } from "@/components/admin-applications-table";
import { AdminDocumentsTable } from "@/components/admin-documents-table";
import { AdminBankingTable } from "@/components/admin-banking-table";
import AdminSystemHealth from "@/components/AdminSystemHealth";
import AdminRiskCenter from "@/components/AdminRiskCenter";
import AdminReports from "@/components/AdminReports";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminAuditLog from "@/components/AdminAuditLog";

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
    title: "Operations",
    items: [
      { id: "payments", label: "Payments", icon: Clock },
      { id: "applications", label: "Applications", icon: Building },
      { id: "documents", label: "Documents", icon: FileText },
      { id: "banking", label: "Banking", icon: CreditCard },
    ]
  },
  {
    title: "Management",
    items: [
      { id: "users", label: "User Management", icon: UserCog },
      { id: "risk", label: "Risk Center", icon: Shield },
    ]
  },
  {
    title: "Analytics",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "reports", label: "Reports", icon: FileSpreadsheet },
      { id: "health", label: "System Health", icon: Gauge },
    ]
  },
  {
    title: "Audit",
    items: [
      { id: "audit", label: "Audit Log", icon: ClipboardList },
    ]
  }
];

type StatsCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple';
  delay?: number;
};

const colorMap: Record<'blue' | 'green' | 'amber' | 'purple', string> = {
  blue: "from-blue-500/10 to-indigo-500/10 border-blue-200/30",
  green: "from-green-500/10 to-emerald-500/10 border-green-200/30",
  amber: "from-amber-500/10 to-orange-500/10 border-amber-200/30",
  purple: "from-purple-500/10 to-pink-500/10 border-purple-200/30",
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = "blue", delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card className={`bg-gradient-to-br ${colorMap[color]} border transition-all duration-500 hover:shadow-xl hover:scale-[1.02] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/10">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        {subtitle && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        )}
        <Progress value={typeof value === 'number' ? Math.min((value / 200) * 100, 100) : 50} className="h-1 mt-3" />
      </CardContent>
    </Card>
  );
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("applications");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastRefresh = useRef<Date>(new Date());

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/applications?limit=1", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data.stats);
      setError("");
      lastRefresh.current = new Date();
    } catch (err) {
      setError("Failed to load dashboard statistics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshTrigger(p => p + 1);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/auth/login");
  };

  const currentSection = NAV_SECTIONS.find(s => s.items.some(i => i.id === activeView));
  const currentItem = currentSection?.items.find(i => i.id === activeView);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-blue-600 mx-auto" />
          <h1 className="text-3xl font-bold">Loading Dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-500/15 blur-[120px] animate-pulse" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Updated: {lastRefresh.current.toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm">System OK</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Auto-refresh</span>
                </div>
              </div>

              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-xs flex items-center justify-center">3</span>
              </Button>

              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="h-5 w-5" />
              </Button>

              <div className="h-8 w-px bg-white/20" />

              <Button onClick={handleRefresh} disabled={refreshing} className="h-9 rounded-full bg-blue-600 hover:bg-blue-700 px-4">
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button onClick={handleLogout} className="h-9 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-4">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Breadcrumb */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-blue-400">{currentSection?.title}</span>
            <span>/</span>
            <span className="text-white">{currentItem?.label}</span>
          </nav>
        </div>

        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Total Applications" value={stats.total_applications} subtitle={`${stats.suppliers} suppliers, ${stats.buyers} buyers`} icon={Users} color="blue" trend="up" trendValue="+12%" delay={0} />
            <StatsCard title="Pending Review" value={stats.pending + stats.under_review} subtitle={`${stats.pending} pending, ${stats.under_review} reviewing`} icon={Clock} color="amber" trend="down" trendValue="-8%" delay={100} />
            <StatsCard title="Ready for Decision" value={stats.ready_for_decision} subtitle="Awaiting approval" icon={AlertTriangle} color="purple" trend={undefined} trendValue={undefined} delay={200} />
            <StatsCard title="Completed" value={stats.approved + stats.rejected} subtitle={`${stats.approved} approved, ${stats.rejected} rejected`} icon={CheckCircle} color="green" trend="up" trendValue="+18%" delay={300} />
          </div>
        )}

        {/* Navigation */}
        <div className="space-y-6">
          {/* Desktop Navigation */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="flex items-center gap-2 pb-4">
              {NAV_SECTIONS.map((section, idx) => (
                <React.Fragment key={section.title}>
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{section.title}</span>
                  </div>
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <Button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`h-10 px-4 rounded-xl ${isActive ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-transparent hover:bg-white/10 text-muted-foreground'}`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    );
                  })}
                  {idx < NAV_SECTIONS.length - 1 && <div className="h-8 w-px bg-white/10" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <Button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-full justify-between h-12 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                {currentItem && <currentItem.icon className="h-5 w-5" />}
                <span>{currentItem?.label}</span>
              </div>
              <ChevronDown className="h-5 w-5" />
            </Button>
            {mobileMenuOpen && (
              <Card className="mt-2 p-2">
                {NAV_SECTIONS.map(section => (
                  <div key={section.title} className="mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">{section.title}</p>
                    {section.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.id}
                          onClick={() => { setActiveView(item.id); setMobileMenuOpen(false); }}
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                ))}
              </Card>
            )}
          </div>

          {/* Content Area */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {currentItem && <currentItem.icon className="h-5 w-5 text-blue-600" />}
                {currentItem?.label}
              </CardTitle>
              <CardDescription>
                {activeView === 'payments' && 'Review, approve, and execute supplier payments'}
                {activeView === 'applications' && 'Review and manage all KYC applications'}
                {activeView === 'documents' && 'Review and verify submitted documents'}
                {activeView === 'banking' && 'Verify supplier banking details'}
                {activeView === 'users' && 'Manage user accounts, roles, and permissions'}
                {activeView === 'risk' && 'Monitor and manage risk flags and overrides'}
                {activeView === 'analytics' && 'Comprehensive analytics and insights'}
                {activeView === 'reports' && 'Generate and export operational reports'}
                {activeView === 'health' && 'Monitor system health and performance'}
                {activeView === 'audit' && 'Review system audit logs and activities'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {activeView === 'payments' && <AdminPaymentQueue tabActive={true} />}
              {activeView === 'applications' && <AdminApplicationsTable refreshTrigger={refreshTrigger} />}
              {activeView === 'documents' && <AdminDocumentsTable refreshTrigger={refreshTrigger} />}
              {activeView === 'banking' && <AdminBankingTable />}
              {activeView === 'users' && <AdminUserManagement />}
              {activeView === 'risk' && <AdminRiskCenter />}
              {activeView === 'analytics' && (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">Analytics charts coming soon</p>
                </div>
              )}
              {activeView === 'reports' && <AdminReports />}
              {activeView === 'health' && <AdminSystemHealth />}
              {activeView === 'audit' && <AdminAuditLog />}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}