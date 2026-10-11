import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { getShiftEntries } from '@/lib/server/transactions.service';

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
    requireRole(user, 'cashier');
    const { id } = params;
    const entries = await getShiftEntries(id, user.userId);
    return NextResponse.json({ success: true, message: 'Entries retrieved.', data: entries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve entries.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
