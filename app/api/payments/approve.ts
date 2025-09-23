import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { id } = await request.json()
  // TODO: Update payment status to 'approved' in DB
  // Log audit trail
  return NextResponse.json({ success: true, id, status: "approved" })
}
