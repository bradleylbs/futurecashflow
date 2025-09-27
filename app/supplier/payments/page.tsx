"use client"
import { SupplierPaymentsTable } from "@/components/supplier-payments-table"

export default function SupplierPaymentsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#fefefe] p-8">
      <h1 className="text-2xl font-bold mb-6">Payments</h1>
      <SupplierPaymentsTable />
    </div>
  )
}
