"use client"

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { RefreshCw, Upload as UploadIcon } from "lucide-react";

export type APRow = {
  company_code: string;
  vendor_number: string;
  vendor_name: string;
  document_number: string;
  document_type: string;
  document_date: string;
  posting_date: string;
  baseline_date: string;
  net_due_date: string;
  days_overdue: string;
  amount_in_document_currency: string;
  document_currency: string;
  amount_in_local_currency: string;
  tax_amount: string;
  payment_terms: string;
  payment_method: string;
  assignment: string;
  reference: string;
  clearing_document: string;
  clearing_date: string;
  open_item_indicator: string;
  text: string;
}




export type UploadSummary = {
  batchId: string
  total: number
  valid: number
  invalid: number
  vendors: string[]
}

export function APUpload({ consentedVendors, buyerId }: { consentedVendors: string[]; buyerId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [rows, setRows] = useState<APRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [confirmation, setConfirmation] = useState<UploadSummary | null>(null)
  const [apiError, setApiError] = useState("")

  const onBrowse = () => inputRef.current?.click()

  // Excel column headers to match
  const EXCEL_COLUMNS = [
    "Company Code",
    "Vendor Number",
    "Vendor Name",
    "Document Number",
    "Document Type",
    "Document Date",
    "Posting Date",
    "Baseline Date",
    "Net Due Date",
    "Days Overdue",
    "Amount (Doc Curr)",
    "Currency",
    "Amount (Local Curr)",
    "Payment Terms",
    "Payment Method",
    "Assignment (PO #)",
    "Reference (Invoice #)",
    "Open Item",
    "Text"
  ];

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return { rows: [], errors: ["Empty file"] };
    const header = lines[0].split(",").map((h) => h.trim());
    const missing = EXCEL_COLUMNS.filter((h) => !header.includes(h));
    if (missing.length) return { rows: [], errors: ["Missing columns: " + missing.join(", ")] };

    const get = (arr: string[], name: string) => arr[header.indexOf(name)]?.trim() ?? "";

    const parsed: APRow[] = [];
    const errs: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length === 1 && cols[0].trim() === "") continue;
      const row: APRow = {
        company_code: get(cols, "Company Code"),
        vendor_number: get(cols, "Vendor Number"),
        vendor_name: get(cols, "Vendor Name"),
        document_number: get(cols, "Document Number"),
        document_type: get(cols, "Document Type"),
        document_date: get(cols, "Document Date"),
        posting_date: get(cols, "Posting Date"),
        baseline_date: get(cols, "Baseline Date"),
        net_due_date: get(cols, "Net Due Date"),
        days_overdue: get(cols, "Days Overdue"),
        amount_in_document_currency: get(cols, "Amount (Doc Curr)"),
        document_currency: get(cols, "Currency"),
        amount_in_local_currency: get(cols, "Amount (Local Curr)"),
        tax_amount: "", // Not present in provided columns
        payment_terms: get(cols, "Payment Terms"),
        payment_method: get(cols, "Payment Method"),
        assignment: get(cols, "Assignment (PO #)"),
        reference: get(cols, "Reference (Invoice #)"),
        clearing_document: "", // Not present in provided columns
        clearing_date: "", // Not present in provided columns
        open_item_indicator: get(cols, "Open Item"),
        text: get(cols, "Text"),
      };
      const lineNo = i + 1;
      if (!row.vendor_number) errs.push(`Line ${lineNo}: Vendor Number is required`);
      if (!row.document_number) errs.push(`Line ${lineNo}: Document Number is required`);
      if (!row.amount_in_document_currency || isNaN(Number(row.amount_in_document_currency))) errs.push(`Line ${lineNo}: Amount (Doc Curr) must be a number`);
      if (!row.document_date) errs.push(`Line ${lineNo}: Document Date is required`);
      if (row.vendor_number && consentedVendors.length && !consentedVendors.includes(row.vendor_number)) {
        errs.push(`Line ${lineNo}: Vendor ${row.vendor_number} is not consented`);
      }
      if (!errs.some((e) => e.includes(`Line ${lineNo}:`))) {
        parsed.push(row);
      }
    }
    return { rows: parsed, errors: errs };
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return
    setConfirmation(null)
    setApiError("")
    const file = files[0]
    const { rows, errors } = await parseCSV(file)
    setRows(rows)
    setErrors(errors)
  }, [consentedVendors])

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    await handleFiles(e.dataTransfer.files)
  }

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ""
  }

  const hasBlockingErrors = useMemo(() => errors.some((e) => /Missing columns|Empty file/.test(e)), [errors])

  const onUpload = async () => {
    setUploading(true)
    setApiError("")
    try {
      const res = await fetch('/api/buyer/invoices/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId, rows })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      setConfirmation(json?.summary || null)
    } catch (e: any) {
      setApiError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent flex items-center gap-3">
          <UploadIcon className="h-6 w-6 text-primary" />
          Upload AP Data (CSV)
        </CardTitle>
        <CardDescription className="text-gray-700 font-medium">
          Drag-and-drop or browse to upload CSVs. Only consented vendor numbers are accepted. Real-time validation (AUTO-B1).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragOver 
              ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-info/10 backdrop-blur-sm scale-105' 
              : 'border-border bg-gradient-to-br from-muted/50 to-card/50 hover:border-primary/40 hover:bg-gradient-to-br hover:from-primary/10 hover:to-info/10'
          }`}
        >
          <div className="mb-4 p-4 bg-gradient-to-br from-primary/20 to-info/20 rounded-full backdrop-blur-sm">
            <UploadIcon className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-gray-800 mb-2">Drag & drop your CSV here</p>
          <p className="text-sm text-gray-600 mb-4">or</p>
          <Button 
            variant="outline" 
            className="bg-white/70 hover:bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 font-medium hover:scale-105" 
            type="button" 
            onClick={onBrowse}
          >
            Browse Files
          </Button>
          <Input ref={inputRef} type="file" accept=".csv" onChange={onInputChange} className="hidden" />
        </div>

        <div className="text-sm text-muted-foreground bg-gradient-to-r from-primary/5 to-info/5 p-4 rounded-xl border-0 shadow-inner">
          <span className="font-semibold text-gray-800">Expected columns:</span> <br />
          {EXCEL_COLUMNS.join(", ")}
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur border-0 shadow-lg rounded-xl">
            <AlertDescription>
              <div className="font-semibold mb-3 text-red-800">Validation Issues</div>
              <ul className="list-disc pl-5 space-y-2">
                {errors.map((e, i) => (<li key={i} className="text-red-700">{e}</li>))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload AP Data button for backend upload */}
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-lg rounded-full px-6 py-2"
          aria-label="Upload AP Data"
          onClick={onUpload}
          disabled={hasBlockingErrors || rows.length === 0 || uploading}
        >
          {uploading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <UploadIcon className="h-5 w-5" />}
          <span>Upload AP Data</span>
        </Button>

        <div className="rounded-xl border-0 p-6 text-sm bg-gradient-to-br from-purple-50/80 to-blue-50/80 backdrop-blur-sm shadow-lg">
          <div className="font-semibold mb-3 text-purple-800 text-lg">API Connector</div>
          <div className="text-gray-700">
            Prefer integrating directly? POST to <code className="bg-white/80 px-2 py-1 rounded-lg font-mono text-blue-700 shadow-inner">/api/buyer/invoices/upload</code> with your AP data.
          </div>
        </div>

        {apiError && (
          <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur border-0 shadow-lg rounded-xl">
            <AlertDescription className="text-red-700 font-medium">{apiError}</AlertDescription>
          </Alert>
        )}

        {confirmation && (
          <div className="rounded-xl border-0 p-6 text-sm bg-gradient-to-br from-blue-50/80 to-purple-50/80 backdrop-blur-sm shadow-lg">
            <div className="font-semibold mb-4 text-blue-800 text-lg flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              Upload Confirmation
            </div>
            <div className="mb-4">
              Batch ID: <span className="font-mono bg-white/80 px-3 py-1 rounded-lg text-blue-800 shadow-inner">{confirmation.batchId}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 p-3 rounded-lg shadow-inner">
                <div className="text-gray-600 text-xs uppercase tracking-wide">Total</div>
                <div className="font-bold text-lg text-gray-900">{confirmation.total}</div>
              </div>
              <div className="bg-white/60 p-3 rounded-lg shadow-inner">
                <div className="text-gray-600 text-xs uppercase tracking-wide">Valid</div>
                <div className="font-bold text-lg text-blue-700">{confirmation.valid}</div>
              </div>
              <div className="bg-white/60 p-3 rounded-lg shadow-inner">
                <div className="text-gray-600 text-xs uppercase tracking-wide">Invalid</div>
                <div className="font-bold text-lg text-red-600">{confirmation.invalid}</div>
              </div>
              <div className="bg-white/60 p-3 rounded-lg shadow-inner">
                <div className="text-gray-600 text-xs uppercase tracking-wide">Vendors</div>
                <div className="font-bold text-sm text-blue-700">{confirmation.vendors.join(', ') || '-'}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
