import { NextResponse } from 'next/server';

import {
  asAdminAuthError,
  createAdminSession,
  getAdminSessionDurationMs,
  isAdminAuthError,
} from '@/lib/adminAuth';
import { ADMIN_SESSION_COOKIE } from '@/lib/authConstants';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';

    if (!idToken) {
      return NextResponse.json({ success: false, error: 'Firebase ID token is required.' }, { status: 400 });
    }

    const { sessionCookie, expiresIn, email } = await createAdminSession(idToken);
    const response = NextResponse.json({
      success: true,
      email,
      expiresIn,
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.floor(getAdminSessionDurationMs() / 1000),
      path: '/',
    });

    return response;
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    const fallbackError = asAdminAuthError(error);
    return NextResponse.json({ success: false, error: fallbackError.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });

  return response;
}
