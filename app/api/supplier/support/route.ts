import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { verifyJWT } from '@/lib/auth';

// GET: List support tickets for the logged-in supplier
export async function GET(req: NextRequest) {
  const user = await verifyJWT(req as unknown as Request);
  if (!user || user.role !== 'supplier') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await executeQuery(
      `SELECT * FROM support_tickets WHERE supplier_user_id = ? ORDER BY created_at DESC`,
      [user.id]
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ tickets: result.data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch tickets', details: String(err) }, { status: 500 });
  }
}

// POST: Create a new support ticket
export async function POST(req: NextRequest) {
  const user = await verifyJWT(req as unknown as Request);
  if (!user || user.role !== 'supplier') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { subject, message } = body;
  if (!subject || !message) {
    return NextResponse.json({ error: 'Missing subject or message' }, { status: 400 });
  }
  try {
    const result = await executeQuery(
      `INSERT INTO support_tickets (supplier_user_id, subject, message, status) VALUES (?, ?, ?, 'open')`,
      [user.id, subject, message]
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create ticket', details: String(err) }, { status: 500 });
  }
}
