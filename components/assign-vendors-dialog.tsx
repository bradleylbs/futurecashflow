"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { RefreshCw, Search, UserPlus } from "lucide-react"

type Supplier = { id: string; email: string }

export function AssignVendorsDialog({ onAssigned }: { onAssigned?: (count: number) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [vendors, setVendors] = useState<string[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [supplierEmail, setSupplierEmail] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierQuery, setSupplierQuery] = useState("")
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  async function loadVendors() {
    try {
      setLoading(true)
      const url = new URL("/api/buyer/vendors/unassigned", window.location.origin)
      if (query.trim()) url.searchParams.set("q", query.trim())
      const res = await fetch(url.toString(), { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to load vendors")
      setVendors(Array.isArray(data?.vendors) ? data.vendors : [])
    } catch (e: any) {
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadVendors()
      ;(async () => {
        try {
          const url = new URL('/api/buyer/suppliers/completed', window.location.origin)
          if (supplierQuery.trim()) url.searchParams.set('q', supplierQuery.trim())
          const res = await fetch(url.toString(), { credentials: 'include' })
          const data = await res.json().catch(() => ({}))
          if (res.ok) setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : [])
          else setSuppliers([])
        } catch {
          setSuppliers([])
        }
      })()
    }
  }, [open])

  const selectedList = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected])
  const canSubmit = selectedList.length > 0 && (!!selectedSupplierId || !!supplierEmail.trim())

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/buyer/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vendor_numbers: selectedList, supplier_user_id: selectedSupplierId || undefined, supplier_email: !selectedSupplierId ? supplierEmail.trim() : undefined })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to assign vendors")
      toast.success(`Assigned ${data?.count ?? selectedList.length} vendor${(data?.count ?? selectedList.length) !== 1 ? 's' : ''}`)
      setOpen(false)
      setSelected({})
      setSupplierEmail("")
      setSelectedSupplierId("")
      onAssigned?.(data?.count ?? selectedList.length)
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign vendors")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white"><UserPlus className="mr-2 h-4 w-4"/>Assign Vendors to Supplier</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Vendors</DialogTitle>
          <DialogDescription>Select one or more unassigned vendor numbers and link them to a supplier.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vendor numbers" className="pl-8" />
            </div>
            <Button variant="outline" onClick={loadVendors} className="border-border"><RefreshCw className="mr-2 h-4 w-4"/>{loading ? 'Searching…' : 'Search'}</Button>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Unassigned vendor numbers</div>
            <div className="rounded border border-border">
              <ScrollArea className="h-60">
                {vendors.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">{loading ? 'Loading…' : 'No unassigned vendors found.'}</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {vendors.map(v => (
                      <label key={v} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer">
                        <Checkbox checked={!!selected[v]} onCheckedChange={(val: any) => setSelected(s => ({ ...s, [v]: !!val }))} />
                        <span className="text-sm font-mono">{v}</span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {selectedList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedList.map(v => (
                <Badge key={v} variant="secondary" className="text-xs font-mono">
                  {v}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Select a completed supplier for this buyer</div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={supplierQuery} onChange={e => setSupplierQuery(e.target.value)} placeholder="Filter suppliers by email" className="pl-8" />
              </div>
              <Button variant="outline" onClick={async () => {
                try {
                  const url = new URL('/api/buyer/suppliers/completed', window.location.origin)
                  if (supplierQuery.trim()) url.searchParams.set('q', supplierQuery.trim())
                  const res = await fetch(url.toString(), { credentials: 'include' })
                  const data = await res.json().catch(() => ({}))
                  if (res.ok) setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : [])
                } catch {}
              }} className="border-border"><RefreshCw className="mr-2 h-4 w-4"/>Search</Button>
            </div>

            <div className="rounded border border-border">
              <ScrollArea className="h-40">
                {suppliers.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No completed suppliers yet.</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {suppliers.map(s => (
                      <label key={s.id} className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer ${selectedSupplierId === s.id ? 'bg-muted' : ''}`}>
                        <Checkbox checked={selectedSupplierId === s.id} onCheckedChange={(val: any) => setSelectedSupplierId(val ? s.id : '')} />
                        <span className="text-sm">{s.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="text-xs text-muted-foreground">Or enter a supplier email (we’ll link if found)</div>
            <Input value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} placeholder="Supplier email (optional when selecting)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || submitting} className="bg-blue-600 hover:bg-blue-700">{submitting ? 'Assigning…' : 'Assign Selected'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
