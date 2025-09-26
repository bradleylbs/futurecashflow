// components/admin/AdminRiskCenter.tsx
"use client";
import { useEffect, useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function AdminRiskCenter() {
  const [rows, setRows] = useState<any[]>([]);
  const [rule, setRule] = useState("all");
  const [note, setNote] = useState("");
  useEffect(()=>{ fetch(`/api/admin/risk/flags?rule=${rule}`).then(r=>r.json()).then(d=>setRows(d.items||[])); },[rule]);
  const override = async (entityId: string) => {
    await fetch(`/api/admin/risk/override`, { method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rule, entityId, justification: note }) });
    setNote("");
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Select value={rule} onValueChange={setRule}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Rule" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="BANK_DUPLICATE">Duplicate Bank A/C</SelectItem>
            <SelectItem value="KYC_REPEAT_REJECT">Repeated KYC Rejects</SelectItem>
            <SelectItem value="OFFER_HIGH_VALUE">High-Value Offers</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Justification for override…" value={note} onChange={e=>setNote(e.target.value)} className="max-w-lg" />
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>Signal</TableHead><TableHead>Count</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r:any)=>(
            <TableRow key={`${r.rule}-${r.signal}`}>
              <TableCell>{r.rule}</TableCell>
              <TableCell>{String(r.signal)}</TableCell>
              <TableCell>{r.cnt}</TableCell>
              <TableCell><Button size="sm" onClick={()=>override(String(r.signal))} disabled={!note}>Override</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
