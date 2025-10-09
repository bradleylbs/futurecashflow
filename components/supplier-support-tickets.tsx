"use client"

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  RefreshCw, 
  MessageSquarePlus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Mail,
  Calendar,
  Search,
  Eye,
  XCircle
} from "lucide-react";

interface Ticket {
  id: string;
  supplier_user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const StatCard = ({ title, value, icon: Icon, color }: any) => {
  const colorStyles: Record<string, string> = {
    blue: "from-primary/20 to-primary/10 text-primary border-primary/30",
    green: "from-success/20 to-success/10 text-success border-success/30",
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
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
    <Skeleton className="h-20" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
  </div>
);

const EmptyState = () => (
  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
    <CardContent className="text-center py-16">
      <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
      <h3 className="text-xl font-semibold mb-2">No Support Tickets</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        You haven't created any support tickets yet. Click the button above to create your first ticket.
      </p>
    </CardContent>
  </Card>
);

export function SupplierSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/supplier/support`);
      const data = await res.json();
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/supplier/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create ticket");
      setSubject("");
      setMessage("");
      setShowCreateDialog(false);
      setSuccess("Support ticket created successfully!");
      setTimeout(() => setSuccess(""), 5000);
      fetchTickets();
    } catch (e: any) {
      setError(e?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { icon: Clock, label: "Open", className: "bg-warning/20 text-warning border-warning/30" },
      in_progress: { icon: RefreshCw, label: "In Progress", className: "bg-primary/20 text-primary border-primary/30" },
      resolved: { icon: CheckCircle2, label: "Resolved", className: "bg-success/20 text-success border-success/30" },
      closed: { icon: CheckCircle2, label: "Closed", className: "bg-muted/20 text-muted-foreground border-muted/30" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;
    
    return (
      <Badge className={`flex items-center gap-1.5 px-2.5 py-1 ${config.className} font-medium text-xs`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchTerm === "" || 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  if (loading && tickets.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Tickets" value={stats.total} icon={Mail} color="blue" />
          <StatCard title="Open" value={stats.open} icon={Clock} color="amber" />
          <StatCard title="In Progress" value={stats.in_progress} icon={RefreshCw} color="blue" />
          <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle2} color="green" />
        </div>

        {/* Filters and Actions */}
        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <label htmlFor="statusFilter" className="sr-only">
              Filter by status
            </label>
            <select
              id="statusFilter"
              title="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-md text-sm focus:bg-white/10 focus:border-white/20 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>

            <Button 
              onClick={fetchTickets} 
              disabled={loading}
              variant="outline"
              className="border-white/20 hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredTickets.length} tickets</span>
            {searchTerm && (
              <Badge variant="secondary" className="bg-white/10">
                Searching: "{searchTerm}"
              </Badge>
            )}
          </div>
        </div>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg truncate">{ticket.subject}</h3>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {ticket.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(ticket.created_at)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{new Date(ticket.created_at).toLocaleString()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span>ID: {ticket.id.slice(0, 8)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Ticket Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Create Support Ticket
              </DialogTitle>
              <DialogDescription>
                Describe your issue and our support team will respond within 24 hours
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {subject.length}/100 characters
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide detailed information about your issue"
                  className="bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 min-h-[150px]"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/1000 characters
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="border-white/20 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitTicket}
                  disabled={submitting || !subject.trim() || !message.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Create Ticket
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Ticket Dialog */}
        {selectedTicket && (
          <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
            <DialogContent className="bg-black/95 backdrop-blur-xl border-white/10 sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  {selectedTicket.subject}
                  {getStatusBadge(selectedTicket.status)}
                </DialogTitle>
                <DialogDescription>
                  Ticket ID: {selectedTicket.id}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-sm text-muted-foreground mb-2">Original Message</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {formatDate(selectedTicket.created_at)}
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}
