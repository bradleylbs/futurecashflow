import { NextResponse } from "next/server"

// Dummy data for demonstration
const offers = [
  {
    id: "1",
    supplier: "Supplier A",
    buyer: "Mine X",
    invoiceNumber: "INV-1001",
    amount: 50000,
    bankDetails: "Bank XYZ, Acc: 123456789",
    status: "pending",
    reference: "PAY-REF-001",
    date: "2025-09-23"
  },
  {
    id: "2",
    supplier: "Supplier B",
    buyer: "Mine Y",
    invoiceNumber: "INV-1002",
    amount: 75000,
    bankDetails: "Bank ABC, Acc: 987654321",
    status: "approved",
    reference: "PAY-REF-002",
    date: "2025-09-22"
  }
]

export async function GET() {
  // Replace with DB fetch in production
  return NextResponse.json(offers)
}
