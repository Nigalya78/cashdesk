import { NextRequest, NextResponse } from 'next/server';

/**
 * Cashier-only app middleware.
 * - Unauthenticated → /login
 * - Authenticated on /login → /cashier/dashboard
 * - Everything else passes through (cashier routes only)
 */

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('cashdesk_token')?.value;

  const isLoginPage    = pathname === '/login';
  const isCashierRoute = pathname.startsWith('/cashier');

  // Not logged in — send to login
  if (!token) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = decodeJwtRole(token);

  // Already logged in — skip login page, go to start-shift page
  if (isLoginPage) {
    return NextResponse.redirect(new URL('/cashier/start-shift', req.url));
  }

  // Only cashier role is valid in this app
  if (isCashierRoute && role !== 'cashier') {
    // Token exists but wrong role — send back to login
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('cashdesk_token');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/cashier/:path*',
  ],
};
