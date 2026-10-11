import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/server/auth';
import { updateEntry, deleteEntry } from '@/lib/server/transactions.service';
import { DenominationValue, VALID_DENOMINATIONS } from '@/lib/server/types';

function errorStatus(err: unknown): number {
  const msg = (err instanceof Error ? err.message : '').toLowerCase();
  if (msg.includes('authentication required') || msg.includes('invalid or expired')) return 401;
  if (msg.includes('permission')) return 403;
  if (msg.includes('not found')) return 404;
  return 400;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    const { id } = params;
    const body = await request.json();
    const { entry_name, denominations, card_amount } = body as {
      entry_name: string;
      denominations: { denomination: DenominationValue; quantity: number }[];
      card_amount: number;
    };
    if (!entry_name?.trim()) return NextResponse.json({ success: false, message: 'Entry name is required.' }, { status: 422 });
    if (!Array.isArray(denominations)) return NextResponse.json({ success: false, message: 'denominations must be an array.' }, { status: 422 });
    for (const d of denominations) {
      if (!VALID_DENOMINATIONS.includes(d.denomination)) return NextResponse.json({ success: false, message: `Invalid denomination: ${d.denomination}` }, { status: 422 });
      if (typeof d.quantity !== 'number' || d.quantity < 0 || !Number.isInteger(d.quantity)) return NextResponse.json({ success: false, message: 'Denomination quantity must be a non-negative integer.' }, { status: 422 });
    }
    const entry = await updateEntry(id, user.userId, { entry_name, denominations, card_amount: Number(card_amount) });
    return NextResponse.json({ success: true, message: 'Entry updated successfully.', data: entry });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update entry.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    requireRole(user, 'cashier');
    const { id } = params;
    await deleteEntry(id, user.userId);
    return NextResponse.json({ success: true, message: 'Entry deleted.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete entry.';
    return NextResponse.json({ success: false, message: msg }, { status: errorStatus(err) });
  }
}
