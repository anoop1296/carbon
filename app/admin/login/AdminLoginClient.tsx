'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { getFirebaseClientAuth } from '@/lib/firebaseClient';

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  const nextPath = searchParams.get('next') || '/admin';

  useEffect(() => {
    fetch('/api/admin/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        if (res.ok) {
          router.replace('/admin');
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const auth = getFirebaseClientAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch('/api/admin/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        await signOut(auth);
        throw new Error(data.error || 'Login failed.');
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,_#f2f8f3_0%,_#ffffff_55%,_#e8f3ee_100%)] px-4 text-slate-900">
        <div className="rounded-[28px] border border-emerald-100 bg-white/90 px-8 py-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          Checking admin session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#f2f8f3_0%,_#ffffff_55%,_#e8f3ee_100%)] px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] border border-emerald-100 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(160deg,_#0f172a_0%,_#1e293b_48%,_#0b3b2e_100%)] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-10">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
              Admin Access
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Secure the CSV admin panel with Firebase login
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              This area is for authorized admins only. Your public Vercel-hosted pages stay open, while the admin
              panel and admin APIs require a valid Firebase session.
            </p>
            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/10 p-5 text-sm leading-7 text-slate-100">
              Use an email and password account from Firebase Authentication. To restrict access even further, add
              specific admin emails in the `ADMIN_EMAILS` environment variable on Vercel.
            </div>
          </section>

          <section className="rounded-[32px] border border-emerald-100 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Login</div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Admin sign in</h2>
              </div>
              <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-emerald-700">
                Back Home
              </Link>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Sign In to Admin Panel'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
