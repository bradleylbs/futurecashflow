"use client"
import { EarlyPaymentOffers } from "@/components/early-payment-offers"

export default function SupplierEarlyPaymentOffersPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#fefefe] p-8">
      <h1 className="text-2xl font-bold mb-6">Early Payment Offers</h1>
      <EarlyPaymentOffers />
    </div>
  )
}
