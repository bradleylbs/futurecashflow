// components/admin/AdminAuditLog.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminAuditLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");  
  const fetchData = useCallback(async () => {
    const r = await fetch(`/api/admin/audit?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    setRows(d.items || []);
  }, [q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Search action, target, actor…" value={q} onChange={e => setQ(e.target.value)} />
        <Button onClick={fetchData}>Search</Button>
        <Button variant="outline" onClick={() => window.open("/api/admin/audit/export", "_blank")}>Export</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead>
            <TableHead>Target</TableHead><TableHead>Metadata</TableHead><TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.id}>
              <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
              <TableCell>{r.actor_email}</TableCell>
              <TableCell>{r.action}</TableCell>
              <TableCell>{r.target_type} · {r.target_id}</TableCell>
              <TableCell><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r.metadata, null, 2)}</pre></TableCell>
              <TableCell>{r.ip_address}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
