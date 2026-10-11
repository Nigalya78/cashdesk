import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/server/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };
    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password are required.' }, { status: 400 });
    }
    const result = await loginUser(username, password);
    return NextResponse.json({ success: true, message: 'Login successful.', data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed.';
    return NextResponse.json({ success: false, message: msg }, { status: 401 });
  }
}
