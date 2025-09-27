import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";

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

export function BuyerPaymentsTable({ buyerId }: { buyerId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!buyerId) return;
    setLoading(true);
    setError("");
    fetch(`/api/buyer/payments?buyer_id=${buyerId}`)
      .then(res => res.json())
      .then(data => {
        setPayments(Array.isArray(data.payments) ? data.payments : []);
      })
      .catch(() => setError("Failed to load payments"))
      .finally(() => setLoading(false));
  }, [buyerId]);

  return (
    <Card className="bg-card border border-border mt-6">
      <CardHeader>
        <CardTitle>Payments to Suppliers</CardTitle>
        <CardDescription>Track all payments made to suppliers, including status and references.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center text-gray-600"><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading payments…</div>
        ) : error ? (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        ) : payments.length === 0 ? (
          <div className="text-sm text-gray-600">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-border rounded">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1 text-left">Supplier</th>
                  <th className="px-2 py-1 text-left">Invoice</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Reference</th>
                  <th className="px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-2 py-1">{p.supplier_user_id}</td>
                    <td className="px-2 py-1">{p.invoice_row_id}</td>
                    <td className="px-2 py-1 text-right">{p.amount.toFixed(2)}</td>
                    <td className="px-2 py-1">{p.payment_date}</td>
                    <td className="px-2 py-1">{p.payment_reference || "-"}</td>
                    <td className="px-2 py-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{p.status}</span>
                    </td>
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
