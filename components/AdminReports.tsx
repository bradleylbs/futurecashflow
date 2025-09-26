// components/admin/AdminReports.tsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminReports() {
  const [overview, setOverview] = useState<any>(null);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  useEffect(()=>{ fetch(`/api/admin/reports/overview?from=${from}&to=${to}`).then(r=>r.json()).then(setOverview); },[from,to]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        <Button variant="outline" onClick={()=>window.open(`/api/admin/reports/offers.csv?from=${from}&to=${to}`,"_blank")}>Export Offers</Button>
        <Button variant="outline" onClick={()=>window.open(`/api/admin/reports/compliance.csv?from=${from}&to=${to}`,"_blank")}>Export Compliance</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Offers Accepted</CardTitle></CardHeader><CardContent>{overview?.offers_accepted ?? '-'}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Fees</CardTitle></CardHeader><CardContent>{overview?.fees_total ?? '-'}</CardContent></Card>
        <Card><CardHeader><CardTitle>KYC Pending</CardTitle></CardHeader><CardContent>{overview?.kyc_pending ?? '-'}</CardContent></Card>
      </div>
    </div>
  );
}
