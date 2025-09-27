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

  const parseCSV = async (file: File) => {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) return { rows: [], errors: ["Empty file"] }
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const required = [
      "company_code","vendor_number","vendor_name","document_number","document_type","document_date","posting_date","baseline_date","net_due_date","days_overdue","amount_in_document_currency","document_currency","amount_in_local_currency","tax_amount","payment_terms","payment_method","assignment","reference","clearing_document","clearing_date","open_item_indicator","text"
    ]
    const missing = required.filter((h) => !header.includes(h))
    if (missing.length) return { rows: [], errors: ["Missing columns: " + missing.join(", ")] }

    const get = (arr: string[], name: string) => arr[header.indexOf(name)]?.trim() ?? ""

    const parsed: APRow[] = []
    const errs: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",")
      if (cols.length === 1 && cols[0].trim() === "") continue
      const row: APRow = {
        company_code: get(cols, "company_code"),
        vendor_number: get(cols, "vendor_number"),
        vendor_name: get(cols, "vendor_name"),
        document_number: get(cols, "document_number"),
        document_type: get(cols, "document_type"),
        document_date: get(cols, "document_date"),
        posting_date: get(cols, "posting_date"),
        baseline_date: get(cols, "baseline_date"),
        net_due_date: get(cols, "net_due_date"),
        days_overdue: get(cols, "days_overdue"),
        amount_in_document_currency: get(cols, "amount_in_document_currency"),
        document_currency: get(cols, "document_currency"),
        amount_in_local_currency: get(cols, "amount_in_local_currency"),
        tax_amount: get(cols, "tax_amount"),
        payment_terms: get(cols, "payment_terms"),
        payment_method: get(cols, "payment_method"),
        assignment: get(cols, "assignment"),
        reference: get(cols, "reference"),
        clearing_document: get(cols, "clearing_document"),
        clearing_date: get(cols, "clearing_date"),
        open_item_indicator: get(cols, "open_item_indicator"),
        text: get(cols, "text"),
      }
      const lineNo = i + 1
      if (!row.vendor_number) errs.push(`Line ${lineNo}: vendor_number is required`)
      if (!row.document_number) errs.push(`Line ${lineNo}: document_number is required`)
      if (!row.amount_in_document_currency || isNaN(Number(row.amount_in_document_currency))) errs.push(`Line ${lineNo}: amount_in_document_currency must be a number`)
      if (!row.document_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.document_date)) errs.push(`Line ${lineNo}: document_date must be YYYY-MM-DD`)
      if (row.vendor_number && consentedVendors.length && !consentedVendors.includes(row.vendor_number)) {
        errs.push(`Line ${lineNo}: vendor ${row.vendor_number} is not consented`)
      }
      if (!errs.some((e) => e.includes(`Line ${lineNo}:`))) {
        parsed.push(row)
      }
    }
    return { rows: parsed, errors: errs }
  }

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
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent flex items-center gap-3">
          <UploadIcon className="h-6 w-6 text-blue-500" />
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
              ? 'border-blue-400 bg-gradient-to-br from-blue-50/80 to-purple-50/80 backdrop-blur-sm scale-105' 
              : 'border-gray-300 bg-gradient-to-br from-gray-50/50 to-white/50 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/60 hover:to-purple-50/60'
          }`}
        >
          <div className="mb-4 p-4 bg-gradient-to-br from-blue-100/80 to-purple-100/80 rounded-full backdrop-blur-sm">
            <UploadIcon className="h-8 w-8 text-blue-600" />
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

        <div className="text-sm text-gray-600 bg-gradient-to-r from-blue-50/60 to-purple-50/60 p-4 rounded-xl border-0 shadow-inner">
          <span className="font-semibold text-gray-800">Expected columns:</span> <br />
          company_code, vendor_number, vendor_name, document_number, document_type, document_date, posting_date, baseline_date, net_due_date, days_overdue, amount_in_document_currency, document_currency, amount_in_local_currency, tax_amount, payment_terms, payment_method, assignment, reference, clearing_document, clearing_date, open_item_indicator, text
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
