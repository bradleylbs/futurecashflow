"use client"
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

interface Ticket {
  id: string;
  supplier_user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export function SupplierSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = () => {
    setLoading(true);
    setError("");
    fetch(`/api/supplier/support`)
      .then(res => res.json())
      .then(data => {
        setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      })
      .catch(() => setError("Failed to load tickets"))
      .finally(() => setLoading(false));
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
      fetchTickets();
    } catch (e: any) {
      setError(e?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-card border border-border mt-6">
      <CardHeader>
        <CardTitle>Support Tickets</CardTitle>
        <CardDescription>Raise a support ticket or view your previous requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="mb-2"
          />
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message"
            className="mb-2"
          />
          <Button onClick={submitTicket} disabled={submitting || !subject.trim() || !message.trim()}>
            {submitting ? "Submitting…" : "Submit Ticket"}
          </Button>
          {error && <div className="mt-2 text-xs text-red-400" role="alert">{error}</div>}
        </div>
        {loading ? (
          <div className="flex items-center text-gray-600"><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div className="text-sm text-gray-600">No support tickets found.</div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-sm border border-border rounded">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1 text-left">Subject</th>
                  <th className="px-2 py-1 text-left">Message</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-2 py-1">{t.subject}</td>
                    <td className="px-2 py-1">{t.message}</td>
                    <td className="px-2 py-1">{t.status}</td>
                    <td className="px-2 py-1">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
