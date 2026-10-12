import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { addCashInReturn, getCashInReturnsForShift } from '@/lib/server/cash-in-returns.service';

function errorStatus(err: unknown): number {
  const msg = (err instanceof Error ? err.message : '').toLowerCase();
  if (msg.includes('authentication required') || msg.includes('invalid or expired')) return 401;
  if (msg.includes('permission')) return 403;
  if (msg.includes('not found')) return 404;
  return 400;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    const shiftId = request.nextUrl.searchParams.get('shift_id');
    if (!shiftId) return NextResponse.json({ success: false, message: 'shift_id is required.' }, { status: 422 });
    const returns = await getCashInReturnsForShift(shiftId, user.userId);
    return NextResponse.json({ success: true, message: 'OK', data: returns });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch cash in returns.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    const body = await request.json();
    const { cash_out_id, shift_id, amount, note } = body as { cash_out_id: string; shift_id: string; amount: number; note: string };
    if (!cash_out_id) return NextResponse.json({ success: false, message: 'cash_out_id is required.' }, { status: 422 });
    if (!shift_id) return NextResponse.json({ success: false, message: 'shift_id is required.' }, { status: 422 });
    if (typeof amount !== 'number' || amount <= 0) return NextResponse.json({ success: false, message: 'amount must be greater than 0.' }, { status: 422 });
    const ret = await addCashInReturn(cash_out_id, shift_id, user.userId, Number(amount), note ?? '');
    return NextResponse.json({ success: true, message: 'Cash in return saved.', data: ret }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save cash in return.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
