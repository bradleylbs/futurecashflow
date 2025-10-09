"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertCircle,
  Info,
  Calendar,
  Building,
  Zap,
  ArrowRight,
  Percent,
  Target,
  TrendingDown,
  Package
} from "lucide-react";

type Offer = {
  invoice_row_id: string;
  invoice_number: string;
  vendor_number: string;
  amount: number;
  due_date: string;
  fee_percent: number;
  fee_amount: number;
  offered_amount: number;
  buyer_id: string;
  buyer_email: string;
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => {
  const colorStyles: Record<string, string> = {
    green: "from-success/20 to-success/10 text-success border-success/30",
    blue: "from-primary/20 to-primary/10 text-primary border-primary/30",
    amber: "from-warning/20 to-warning/10 text-warning border-warning/30",
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
    <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
      <Skeleton className="h-32" />
    </div>
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48" />)}
    </div>
  </div>
);

const EmptyState = () => (
  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
    <CardContent className="text-center py-16">
      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
      <h3 className="text-xl font-semibold mb-2">No Early Payment Offers</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        No eligible offers right now. Offers appear for invoices due in ≥48 hours with buyer consent.
      </p>
      <Alert className="mt-6 max-w-lg mx-auto border-primary/50 bg-primary/10">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-sm">
          Early payment offers allow you to receive payment before the due date at a transparent fee.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

export function EarlyPaymentOffers() {
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"accept" | "decline" | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/supplier/offers", { credentials: "include" });
      if (!resp.ok) throw new Error("Failed to load offers");
      const data = await resp.json();
      const raw = Array.isArray(data?.offers) ? data.offers : [];
      const normalized: Offer[] = raw.map((o: any) => ({
        invoice_row_id: String(o.invoice_row_id),
        invoice_number: String(o.invoice_number),
        vendor_number: String(o.vendor_number),
        amount: Number(o.amount),
        due_date: String(o.due_date),
        fee_percent: Number(o.fee_percent),
        fee_amount: Number(o.fee_amount),
        offered_amount: Number(o.offered_amount),
        buyer_id: String(o.buyer_id),
        buyer_email: String(o.buyer_email),
      }));
      setOffers(normalized);
    } catch (e: any) {
      setError(e?.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = (offer: Offer, action: "accept" | "decline") => {
    setSelectedOffer(offer);
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const confirmActionHandler = async () => {
    if (!selectedOffer || !confirmAction) return;
    
    setProcessing(true);
    try {
      const resp = await fetch(`/api/supplier/offers/${confirmAction}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_row_id: selectedOffer.invoice_row_id }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `Failed to ${confirmAction}`);
      
      setSuccess(
        confirmAction === "accept"
          ? "Offer accepted! Early payment will be processed shortly."
          : "Offer declined. Payment will proceed normally on due date."
      );
      setTimeout(() => setSuccess(""), 5000);
      setOffers(prev => prev.filter(o => o.invoice_row_id !== selectedOffer.invoice_row_id));
      setShowConfirmDialog(false);
    } catch (e: any) {
      setError(e?.message || "Action failed. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setProcessing(false);
      setSelectedOffer(null);
      setConfirmAction(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateSavingsPercentage = (offer: Offer) => {
    return ((offer.offered_amount / offer.amount) * 100).toFixed(1);
  };

  const totalOfferedValue = offers.reduce((sum, o) => sum + o.offered_amount, 0);
  const totalOriginalValue = offers.reduce((sum, o) => sum + o.amount, 0);
  const totalFees = offers.reduce((sum, o) => sum + o.fee_amount, 0);

  if (loading && offers.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="border-error/50 bg-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success/50 bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Overview */}
      {offers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Available Early Payment"
            value={formatCurrency(totalOfferedValue)}
            icon={DollarSign}
            color="green"
            subtitle={`From ${offers.length} ${offers.length === 1 ? 'invoice' : 'invoices'}`}
          />
          <StatCard
            title="Original Amount"
            value={formatCurrency(totalOriginalValue)}
            icon={Target}
            color="blue"
            subtitle="If you wait until due date"
          />
          <StatCard
            title="Total Fees"
            value={formatCurrency(totalFees)}
            icon={Percent}
            color="amber"
            subtitle="Cost of early payment"
          />
        </div>
      )}

      {/* Main Card */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                <Zap className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Early Payment Offers</CardTitle>
                <CardDescription className="mt-2">
                  Get paid early at a transparent fee. Offers appear for invoices due in ≥48 hours with buyer consent.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={load}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => {
                const daysUntilDue = getDaysUntilDue(offer.due_date);
                const savingsPercent = calculateSavingsPercentage(offer);
                const urgencyColor = daysUntilDue <= 7 ? "red" : daysUntilDue <= 14 ? "amber" : "green";

                return (
                  <Card
                    key={offer.invoice_row_id}
                    className="bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                  >
                    <CardContent className="p-5">
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Invoice #{offer.invoice_number}
                            </Badge>
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              Vendor #{offer.vendor_number}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            <span className="truncate">{offer.buyer_email}</span>
                          </div>
                        </div>
                        <Badge
                          className={`${
                            urgencyColor === "red"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : urgencyColor === "amber"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-green-500/20 text-green-400 border-green-500/30"
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {daysUntilDue} days until due
                        </Badge>
                      </div>

                      {/* Financial Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-blue-400" />
                            <span className="text-xs text-muted-foreground">Invoice Value</span>
                          </div>
                          <p className="text-xl font-bold tabular-nums">{formatCurrency(offer.amount)}</p>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Percent className="h-4 w-4 text-amber-400" />
                            <span className="text-xs text-muted-foreground">Early Payment Fee</span>
                          </div>
                          <p className="text-xl font-bold text-amber-400 tabular-nums">
                            {offer.fee_percent}% ({formatCurrency(offer.fee_amount)})
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-green-400" />
                            <span className="text-xs text-muted-foreground">You Receive Now</span>
                          </div>
                          <p className="text-xl font-bold text-green-400 tabular-nums">
                            {formatCurrency(offer.offered_amount)}
                          </p>
                        </div>
                      </div>

                      {/* Due Date Info */}
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Due date: <span className="font-medium text-foreground">{new Date(offer.due_date).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <Separator className="mb-4 bg-white/10" />

                      {/* Comparison Section */}
                      <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-400 mb-1">Compare Your Options</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-400" />
                                <span>Accept: Get <span className="font-semibold text-green-400">{formatCurrency(offer.offered_amount)}</span> now</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-400" />
                                <span>Wait: Get <span className="font-semibold text-foreground">{formatCurrency(offer.amount)}</span> in {daysUntilDue} days</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 flex-wrap">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700 min-w-[140px]" 
                          onClick={() => handleAction(offer, "accept")}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accept Offer
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 border-white/20 hover:bg-white/10 min-w-[140px]" 
                          onClick={() => handleAction(offer, "decline")}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {selectedOffer && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {confirmAction === "accept" ? "Accept Early Payment Offer" : "Decline Early Payment Offer"}
              </DialogTitle>
              <DialogDescription>
                Invoice #{selectedOffer.invoice_number}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              {confirmAction === "accept" ? (
                <>
                  <Alert className="border-success/50 bg-success/10">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription>
                      You will receive <span className="font-bold text-green-400">{formatCurrency(selectedOffer.offered_amount)}</span> immediately
                    </AlertDescription>
                  </Alert>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original amount:</span>
                      <span className="font-medium">{formatCurrency(selectedOffer.amount)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Early payment fee ({selectedOffer.fee_percent}%):</span>
                      <span className="font-medium">-{formatCurrency(selectedOffer.fee_amount)}</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between text-lg font-bold text-green-400">
                      <span>You receive:</span>
                      <span>{formatCurrency(selectedOffer.offered_amount)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Alert className="border-primary/50 bg-primary/10">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription>
                      You will receive the full amount of <span className="font-bold text-blue-400">{formatCurrency(selectedOffer.amount)}</span> on the due date
                    </AlertDescription>
                  </Alert>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Payment due: <span className="font-medium text-foreground">{new Date(selectedOffer.due_date).toLocaleDateString()}</span></span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={processing}
                className="border-white/20 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmActionHandler}
                disabled={processing}
                className={confirmAction === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
              >
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {confirmAction === "accept" ? "Confirm Accept" : "Confirm Decline"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
