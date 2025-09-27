import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { verifyJWT } from '@/lib/auth';

// GET: Fetch supplier profile
export async function GET(req: NextRequest) {
  const user = await verifyJWT(req as unknown as Request);
  if (!user || user.role !== 'supplier') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await executeQuery(
      `SELECT company_name, email, phone, address FROM companies WHERE user_id = ? LIMIT 1`,
      [user.id]
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  return NextResponse.json({ profile: (result.data && result.data[0]) ? result.data[0] : null });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch profile', details: String(err) }, { status: 500 });
  }
}

// POST: Update supplier profile
export async function POST(req: NextRequest) {
  const user = await verifyJWT(req as unknown as Request);
  if (!user || user.role !== 'supplier') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { company_name, email, phone, address } = body;
  if (!company_name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  try {
    const result = await executeQuery(
      `UPDATE companies SET company_name = ?, email = ?, phone = ?, address = ? WHERE user_id = ?`,
      [company_name, email, phone || '', address || '', user.id]
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update profile', details: String(err) }, { status: 500 });
  }
}
