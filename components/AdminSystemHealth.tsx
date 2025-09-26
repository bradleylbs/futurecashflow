// components/admin/AdminSystemHealth.tsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AdminSystemHealth() {
  const [h, setH] = useState<any>(null);
  useEffect(()=>{ fetch(`/api/admin/health`).then(r=>r.json()).then(setH); },[]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardHeader><CardTitle>AP Failed Batches</CardTitle></CardHeader><CardContent>{h?.ap_failed_batches ?? '-'}</CardContent></Card>
      <Card><CardHeader><CardTitle>Active Offers</CardTitle></CardHeader><CardContent>{h?.offers_active ?? '-'}</CardContent></Card>
      <Card><CardHeader><CardTitle>KYC Under Review</CardTitle></CardHeader><CardContent>{h?.kyc_under_review ?? '-'}</CardContent></Card>
    </div>
  );
}
