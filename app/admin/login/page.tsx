import { Suspense } from 'react';

import AdminLoginClient from './AdminLoginClient';

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,_#f2f8f3_0%,_#ffffff_55%,_#e8f3ee_100%)] px-4 text-slate-900">
      <div className="rounded-[28px] border border-emerald-100 bg-white/90 px-8 py-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        Loading admin login...
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginClient />
    </Suspense>
  );
}
