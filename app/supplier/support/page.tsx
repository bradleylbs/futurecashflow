"use client"
import { SupplierSupportTickets } from "@/components/supplier-support-tickets"

export default function SupplierSupportPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#fefefe] p-8">
      <h1 className="text-2xl font-bold mb-6">Support Tickets</h1>
      <SupplierSupportTickets />
    </div>
  )
}
