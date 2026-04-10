import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';

import { ADMIN_SESSION_COOKIE } from '@/lib/authConstants';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export type AdminSession = {
  email: string;
  uid: string;
};

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = status;
  }
}

function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const allowedEmails = getAllowedAdminEmails();
  if (!allowedEmails.length) {
    return true;
  }

  return allowedEmails.includes(email.toLowerCase());
}

function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export async function createAdminSession(idToken: string) {
  const auth = getAdminAuth();
  const decodedToken = await auth.verifyIdToken(idToken);

  if (!isAllowedAdminEmail(decodedToken.email)) {
    throw new AdminAuthError('This account is not allowed to access the admin panel.', 403);
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  return {
    sessionCookie,
    expiresIn: SESSION_DURATION_MS,
    email: decodedToken.email || '',
  };
}

export async function getAdminSession(): Promise<AdminSession> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    throw new AdminAuthError('Please log in to continue.', 401);
  }

  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);

    if (!isAllowedAdminEmail(decodedToken.email)) {
      throw new AdminAuthError('This account is not allowed to access the admin panel.', 403);
    }

    if (!decodedToken.email) {
      throw new AdminAuthError('No email address found on this account.', 403);
    }

    return {
      email: decodedToken.email,
      uid: decodedToken.uid,
    };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      throw error;
    }

    throw new AdminAuthError('Your admin session is invalid or expired. Please log in again.', 401);
  }
}

export async function clearAdminSession() {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export function getAdminSessionDurationMs() {
  return SESSION_DURATION_MS;
}

export function asAdminAuthError(error: unknown) {
  if (error instanceof AdminAuthError) {
    return error;
  }

  return new AdminAuthError(error instanceof Error ? error.message : 'Unauthorized.', 401);
}

export function isAdminAuthError(error: unknown): error is AdminAuthError {
  return error instanceof AdminAuthError;
}
