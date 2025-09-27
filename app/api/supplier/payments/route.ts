import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { verifyJWT } from '@/lib/auth';

// GET: List payments for the logged-in supplier
export async function GET(req: NextRequest) {
  const user = await verifyJWT(req as unknown as Request);
  if (!user || user.role !== 'supplier') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await executeQuery(
      `SELECT * FROM payments WHERE supplier_user_id = ? ORDER BY payment_date DESC`,
      [user.id]
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ payments: result.data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch payments', details: String(err) }, { status: 500 });
  }
}
