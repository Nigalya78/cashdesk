import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { deleteCashInReturn } from '@/lib/server/cash-in-returns.service';

function errorStatus(err: unknown): number {
  const msg = (err instanceof Error ? err.message : '').toLowerCase();
  if (msg.includes('authentication required') || msg.includes('invalid or expired')) return 401;
  if (msg.includes('permission')) return 403;
  if (msg.includes('not found')) return 404;
  return 400;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    await deleteCashInReturn(params.id, user.userId);
    return NextResponse.json({ success: true, message: 'Cash in return deleted.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete cash in return.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
