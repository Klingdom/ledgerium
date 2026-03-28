import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Lightweight middleware — checks for NextAuth session token cookie.
 * Full auth validation happens in the API routes and server components.
 *
 * NextAuth v5 (beta) uses "authjs.session-token" in dev and
 * "__Secure-authjs.session-token" in production (HTTPS).
 * Earlier versions used "next-auth.session-token".
 * We check all variants for compatibility.
 */
export function middleware(request: NextRequest) {
  const hasSession = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
  ].some((name) => request.cookies.get(name)?.value);

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/workflows/:path*',
    '/upload/:path*',
    '/account/:path*',
    '/analytics/:path*',
  ],
};
