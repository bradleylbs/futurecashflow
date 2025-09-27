import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// GET: List payments for a buyer
export async function GET(req: NextRequest) {
  const buyerId = req.nextUrl.searchParams.get('buyer_id');
  if (!buyerId) {
    return NextResponse.json({ error: 'buyer_id is required' }, { status: 400 });
  }
  try {
    const result = await executeQuery(
      `SELECT * FROM payments WHERE buyer_id = ? ORDER BY payment_date DESC`,
      [buyerId]
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ payments: result.data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch payments', details: String(err) }, { status: 500 });
  }
}

// POST: Create a new payment
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { buyer_id, supplier_user_id, invoice_row_id, amount, payment_date, payment_reference, status } = body;
  if (!buyer_id || !supplier_user_id || !invoice_row_id || !amount || !payment_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  try {
    const result = await executeQuery(
      `INSERT INTO payments (id, buyer_id, supplier_user_id, invoice_row_id, amount, payment_date, payment_reference, status) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [buyer_id, supplier_user_id, invoice_row_id, amount, payment_date, payment_reference || null, status || 'pending']
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create payment', details: String(err) }, { status: 500 });
  }
}
