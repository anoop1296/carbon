import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE } from '@/lib/authConstants';

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/admin/login', req.url);
  loginUrl.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (pathname.startsWith('/api/admin/auth')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (pathname.startsWith('/admin')) {
      return redirectToLogin(req);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
