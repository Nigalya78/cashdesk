import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { getShiftById } from '@/lib/server/shifts.service';

function errorStatus(err: unknown): number {
  const msg = (err instanceof Error ? err.message : '').toLowerCase();
  if (msg.includes('authentication required') || msg.includes('invalid or expired')) return 401;
  if (msg.includes('permission')) return 403;
  if (msg.includes('not found')) return 404;
  return 400;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const { id } = params;
    const shift = await getShiftById(id);
    if (!shift) return NextResponse.json({ success: false, message: 'Shift not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Shift retrieved.', data: shift });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve shift.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
