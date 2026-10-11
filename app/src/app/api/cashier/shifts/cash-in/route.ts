import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { updateOpeningCashIn } from '@/lib/server/shifts.service';

function errorStatus(err: unknown): number {
  const msg = (err instanceof Error ? err.message : '').toLowerCase();
  if (msg.includes('authentication required') || msg.includes('invalid or expired')) return 401;
  if (msg.includes('permission')) return 403;
  if (msg.includes('not found')) return 404;
  return 400;
}

export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    const body = await request.json();
    const { shift_id, amount } = body as { shift_id: string; amount: number };
    if (!shift_id) return NextResponse.json({ success: false, message: 'shift_id is required.' }, { status: 422 });
    if (typeof amount !== 'number' || amount < 0) return NextResponse.json({ success: false, message: 'amount must be a non-negative number.' }, { status: 422 });
    const shift = await updateOpeningCashIn(shift_id, user.userId, Number(amount));
    return NextResponse.json({ success: true, message: 'Cash In updated.', data: shift });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update Cash In.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
