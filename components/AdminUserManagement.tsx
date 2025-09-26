// components/admin/AdminUserManagement.tsx
"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminUserManagement() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  useEffect(() => { 
    fetch(`/api/admin/users?q=${encodeURIComponent(q)}&role=${role}`).then(r=>r.json()).then(d=>setRows(d.items||[]));
  }, [q, role]);
  const changeRole = async (id: string, newRole: string) => {
    await fetch(`/api/admin/users/${id}/role`, { method:"PUT", headers:{'Content-Type':'application/json'}, body:JSON.stringify({role:newRole})});
    setRows(rows.map(r => r.id===id ? {...r, role:newRole} : r));
  };
  const toggleStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/users/${id}/status`, { method:"PUT", headers:{'Content-Type':'application/json'}, body:JSON.stringify({account_status:status})});
    setRows(rows.map(r => r.id===id ? {...r, account_status:status} : r));
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Search user…" value={q} onChange={e=>setQ(e.target.value)} />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="buyer">Buyer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="fm_admin">FM Admin</SelectItem>
            <SelectItem value="fa_admin">FA Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(u => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Select value={u.role} onValueChange={v=>changeRole(u.id, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="fm_admin">FM Admin</SelectItem>
                    <SelectItem value="fa_admin">FA Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{u.account_status}</TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" variant="outline" onClick={()=>toggleStatus(u.id, u.account_status==='active'?'suspended':'active')}>
                  {u.account_status==='active'?'Suspend':'Activate'}
                </Button>
                <Button size="sm" variant="outline" onClick={()=>fetch(`/api/admin/users/${u.id}/reset-password`,{method:"POST"})}>
                  Reset password
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
