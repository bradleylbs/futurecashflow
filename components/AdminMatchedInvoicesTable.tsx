import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText } from "lucide-react";

interface MatchedInvoice {
  id: number;
  invoice_number: string;
  supplier_name: string;
  amount: number;
  status: string;
  matched_at: string;
}

const AdminMatchedInvoicesTable: React.FC = () => {
  const [invoices, setInvoices] = useState<MatchedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch("/api/admin/invoices/matched", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch matched invoices");
        const data = await res.json();
        setInvoices(data.invoices || []);
        setError("");
      } catch (err) {
        setError("Failed to load matched invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading matched invoices…</div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Matched Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No matched invoices found.</div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Matched At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.invoice_number}</TableCell>
                  <TableCell>{inv.supplier_name}</TableCell>
                  <TableCell>{inv.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                  <TableCell>{inv.status}</TableCell>
                  <TableCell>{new Date(inv.matched_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMatchedInvoicesTable;
