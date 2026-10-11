import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/server/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, password } = body as { name: string; username: string; password: string };
    if (!name || !username || !password) {
      return NextResponse.json({ success: false, message: 'Name, username and password are required.' }, { status: 400 });
    }
    const user = await registerUser(name, username, password);
    return NextResponse.json({ success: true, message: 'Registration successful. You can now log in.', data: user }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed.';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
