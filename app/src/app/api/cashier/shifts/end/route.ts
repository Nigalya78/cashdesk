import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { endShift } from '@/lib/server/shifts.service';

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
    const { shift_id } = body as { shift_id: string };
    if (!shift_id) return NextResponse.json({ success: false, message: 'shift_id is required.' }, { status: 422 });
    const completed = await endShift(shift_id, user.userId);
    return NextResponse.json({ success: true, message: 'Shift ended successfully.', data: completed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to end shift.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
