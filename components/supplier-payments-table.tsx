"use client"

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RefreshCw,
  Download,
  Search,
  DollarSign,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  TrendingUp,
  Package
} from "lucide-react";

interface Payment {
  id: string;
  buyer_id: string;
  supplier_user_id: string;
  invoice_row_id: string;
  amount: number;
  payment_date: string;
  payment_reference?: string;
  status: "pending" | "paid" | "failed" | "reversed";
  created_at: string;
  updated_at: string;
}

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => {
  const colorStyles: Record<string, string> = {
    green: "from-success/20 to-success/10 text-success border-success/30",
    amber: "from-warning/20 to-warning/10 text-warning border-warning/30",
    red: "from-error/20 to-error/10 text-error border-error/30",
    blue: "from-primary/20 to-primary/10 text-primary border-primary/30",
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colorStyles[color]} backdrop-blur-sm border hover:scale-[1.02] transition-all duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
    <Skeleton className="h-20" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
    </div>
  </div>
);

const EmptyState = () => (
  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
    <CardContent className="text-center py-16">
      <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
      <h3 className="text-xl font-semibold mb-2">No Payments Found</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        No payment records match your current filters. Try adjusting your search criteria.
      </p>
    </CardContent>
  </Card>
);

export function SupplierPaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPayments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/supplier/payments`);
      const data = await res.json();
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch {
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const statistics = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    
    return {
      total: payments.length,
      paid: payments.filter(p => p.status === 'paid').length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length,
      totalAmount,
      paidAmount,
      pendingAmount
    };
  }, [payments]);

  const getStatusBadge = (status: string) => {
    const configs = {
      paid: { icon: CheckCircle2, label: "Paid", className: "bg-success/20 text-success border-success/30" },
      pending: { icon: Clock, label: "Pending", className: "bg-warning/20 text-warning border-warning/30" },
      failed: { icon: XCircle, label: "Failed", className: "bg-error/20 text-error border-error/30" },
      reversed: { icon: AlertTriangle, label: "Reversed", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" }
    };
    
    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${config.className} font-medium text-xs`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === "" ||
      payment.buyer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice_row_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading && payments.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(statistics.totalAmount)}
            icon={DollarSign}
            color="green"
            subtitle={`${statistics.total} payments`}
          />
          <StatCard
            title="Received"
            value={formatCurrency(statistics.paidAmount)}
            icon={CheckCircle2}
            color="green"
            subtitle={`${statistics.paid} paid`}
          />
          <StatCard
            title="Pending"
            value={formatCurrency(statistics.pendingAmount)}
            icon={Clock}
            color="amber"
            subtitle={`${statistics.pending} awaiting`}
          />
          <StatCard
            title="Failed"
            value={statistics.failed}
            icon={XCircle}
            color="red"
            subtitle="Requires attention"
          />
        </div>

        {/* Filters and Actions */}
        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by buyer, invoice, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
              />
            </div>

            <label htmlFor="statusFilter" className="sr-only">
              Filter by payment status
            </label>
            <select
              id="statusFilter"
              aria-label="Filter by payment status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-md text-sm focus:bg-white/10 focus:border-white/20 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed</option>
            </select>

            <Button
              variant="outline"
              className="border-white/20 hover:bg-white/10"
              onClick={() => {/* Export functionality */}}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              onClick={fetchPayments}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>{filteredPayments.length} payments</span>
            {searchTerm && (
              <Badge variant="secondary" className="bg-white/10">
                Searching: "{searchTerm}"
              </Badge>
            )}
          </div>
        </div>

        {/* Payments Cards */}
        {filteredPayments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <Card
                key={payment.id}
                className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                          <Building className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <h3 className="font-semibold truncate cursor-help">
                                  Buyer: {payment.buyer_id.slice(0, 8)}...
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Full ID: {payment.buyer_id}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground truncate cursor-help">
                                  Invoice: {payment.invoice_row_id.slice(0, 12)}...
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Full Invoice ID: {payment.invoice_row_id}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-semibold text-green-400 tabular-nums">
                              {formatCurrency(payment.amount)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Payment Date</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium cursor-help">
                                    {formatDate(payment.payment_date)}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{new Date(payment.payment_date).toLocaleString()}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="text-xs text-muted-foreground">Reference</p>
                            <p className="font-medium truncate">
                              {payment.payment_reference || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {payment.status === 'failed' && (
                        <Alert className="mt-3 border-red-500/50 bg-red-500/10">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <AlertDescription className="text-xs">
                            Payment failed - please contact the buyer or support
                          </AlertDescription>
                        </Alert>
                      )}

                      {payment.status === 'reversed' && (
                        <Alert className="mt-3 border-purple-500/50 bg-purple-500/10">
                          <AlertTriangle className="h-4 w-4 text-purple-400" />
                          <AlertDescription className="text-xs">
                            Payment was reversed - contact support for details
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View details</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}