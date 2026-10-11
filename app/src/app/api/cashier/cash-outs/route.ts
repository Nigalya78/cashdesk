import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { createCashOut } from '@/lib/server/cash-outs.service';

function errorStatus(err: unknown): number {
  const msg = (err instanceof Error ? err.message : '').toLowerCase();
  if (msg.includes('authentication required') || msg.includes('invalid or expired')) return 401;
  if (msg.includes('permission')) return 403;
  if (msg.includes('not found')) return 404;
  return 400;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    const body = await request.json();
    const { shift_id, amount, note } = body as { shift_id: string; amount: number; note: string };
    if (!shift_id) return NextResponse.json({ success: false, message: 'shift_id is required.' }, { status: 422 });
    if (typeof amount !== 'number' || amount <= 0) return NextResponse.json({ success: false, message: 'amount must be greater than 0.' }, { status: 422 });
    if (!note?.trim()) return NextResponse.json({ success: false, message: 'Note is required.' }, { status: 422 });
    const cashOut = await createCashOut(shift_id, user.userId, Number(amount), note);
    return NextResponse.json({ success: true, message: 'Cash out saved.', data: cashOut }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save cash out.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
