import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { getUserById } from '@/lib/server/auth.service';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const found = await getUserById(user.userId);
    if (!found) return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Authenticated.', data: found });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve user.';
    const status = msg.includes('Authentication') || msg.includes('token') ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
