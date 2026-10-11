import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { openShift, getCashierShifts } from '@/lib/server/shifts.service';
import { isValidDate, isValidDateRange } from '@/lib/server/dateUtils';

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
    const shift = await openShift(user.userId);
    return NextResponse.json({ success: true, message: 'Shift opened successfully.', data: shift }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to open shift.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    const { searchParams } = new URL(request.url);
    const from_date = searchParams.get('from_date') ?? undefined;
    const to_date = searchParams.get('to_date') ?? undefined;
    if (from_date && !isValidDate(from_date)) {
      return NextResponse.json({ success: false, message: 'Invalid from_date.' }, { status: 422 });
    }
    if (to_date && !isValidDate(to_date)) {
      return NextResponse.json({ success: false, message: 'Invalid to_date.' }, { status: 422 });
    }
    if (from_date && to_date && !isValidDateRange(from_date, to_date)) {
      return NextResponse.json({ success: false, message: 'from_date must be on or before to_date.' }, { status: 422 });
    }
    const shifts = await getCashierShifts(user.userId, from_date, to_date);
    return NextResponse.json({ success: true, message: 'Shifts retrieved.', data: shifts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve shifts.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
