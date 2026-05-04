'use client';

import { useEffect, useMemo, useState } from 'react';

export interface MonthlyRow {
  vlcode: string;
  village_name: string;
  activity: string;
  unit: string;
  monthly_quantity: string;
}

const WIDTH_CLASSES = [
  'w-0', 'w-[5%]', 'w-[10%]', 'w-[15%]', 'w-[20%]', 'w-[25%]',
  'w-[30%]', 'w-[35%]', 'w-[40%]', 'w-[45%]', 'w-1/2',
  'w-[55%]', 'w-[60%]', 'w-[65%]', 'w-[70%]', 'w-[75%]',
  'w-[80%]', 'w-[85%]', 'w-[90%]', 'w-[95%]', 'w-full',
] as const;

const PALETTE = [
  { badge: 'bg-orange-100 text-orange-700', text: 'text-orange-600', track: 'bg-orange-100', fill: 'bg-orange-500', ring: 'ring-orange-200' },
  { badge: 'bg-stone-100 text-stone-700',   text: 'text-stone-600',  track: 'bg-stone-100',  fill: 'bg-stone-500',  ring: 'ring-stone-200'  },
  { badge: 'bg-amber-100 text-amber-700',   text: 'text-amber-600',  track: 'bg-amber-100',  fill: 'bg-amber-500',  ring: 'ring-amber-200'  },
  { badge: 'bg-violet-100 text-violet-700', text: 'text-violet-600', track: 'bg-violet-100', fill: 'bg-violet-500', ring: 'ring-violet-200' },
  { badge: 'bg-red-100 text-red-700',       text: 'text-red-600',    track: 'bg-red-100',    fill: 'bg-red-500',    ring: 'ring-red-200'    },
  { badge: 'bg-blue-100 text-blue-700',     text: 'text-blue-600',   track: 'bg-blue-100',   fill: 'bg-blue-500',   ring: 'ring-blue-200'   },
  { badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600', track: 'bg-emerald-100', fill: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { badge: 'bg-cyan-100 text-cyan-700',     text: 'text-cyan-600',   track: 'bg-cyan-100',   fill: 'bg-cyan-500',   ring: 'ring-cyan-200'   },
  { badge: 'bg-pink-100 text-pink-700',     text: 'text-pink-600',   track: 'bg-pink-100',   fill: 'bg-pink-500',   ring: 'ring-pink-200'   },
  { badge: 'bg-teal-100 text-teal-700',     text: 'text-teal-600',   track: 'bg-teal-100',   fill: 'bg-teal-500',   ring: 'ring-teal-200'   },
];

function truncate(text: string, max = 24): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function getWidthClass(percent: number): string {
  const index = Math.round(Math.max(0, Math.min(100, percent)) / 5);
  return WIDTH_CLASSES[index];
}

function badgeText(activity: string): string {
  return activity
    .split(/\s+/)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

export default function MonthlyActivity({ rows }: { rows: MonthlyRow[] | null | undefined }) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Deduplicate activities (sum if same activity appears multiple times)
  const items = useMemo(() => {
    const map = new Map<string, { unit: string; val: number; idx: number }>();
    let idxCounter = 0;
    (rows || []).forEach((r) => {
      const v = parseFloat(r.monthly_quantity || '0') || 0;
      if (v <= 0) return;
      if (map.has(r.activity)) {
        map.get(r.activity)!.val += v;
      } else {
        map.set(r.activity, { unit: r.unit, val: v, idx: idxCounter++ });
      }
    });
    return Array.from(map.entries())
      .map(([activity, { unit, val, idx }]) => ({ activity, unit, val, idx }))
      .sort((a, b) => b.val - a.val);
  }, [rows]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        No monthly data available
      </div>
    );
  }

  const total      = items.reduce((s, i) => s + i.val, 0);
  const annualTotal = total * 12;
  const average    = total / items.length;
  const shown      = isNarrow ? items.slice(0, 6) : items.slice(0, 8);
  const max        = Math.max(...shown.map((i) => i.val), 1);
  const activeItem = items.find((i) => i.activity === selected) || items[0];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Monthly Activity</h3>
          <p className="mt-1 text-sm text-slate-500">Consumption ranked by monthly quantity</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total / Month', value: total.toLocaleString(),        sub: 'all units' },
            { label: 'Annual Est.',   value: annualTotal.toLocaleString(),  sub: 'projected' },
            { label: 'Avg / Activity',value: average.toFixed(1),            sub: 'monthly'   },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500">{card.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-3">
          {shown.map((item) => {
            const tone    = PALETTE[item.idx % PALETTE.length];
            const share   = total > 0 ? (item.val / total) * 100 : 0;
            const relative = max > 0 ? (item.val / max) * 100 : 0;
            const isActive = activeItem.activity === item.activity;

            return (
              <button
                key={item.activity}
                type="button"
                onClick={() => setSelected((prev) => (prev === item.activity ? null : item.activity))}
                className={`w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${isActive ? `ring-2 ${tone.ring}` : ''}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.badge}`}>
                      {badgeText(item.activity)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{truncate(item.activity)}</div>
                      <div className="text-xs text-slate-500">{share.toFixed(1)}% of monthly total</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${tone.text}`}>{item.val.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{item.unit || 'unit'}</div>
                  </div>
                </div>
                <div className={`mt-3 h-2 rounded-full ${tone.track}`}>
                  <div className={`h-2 rounded-full transition-all duration-500 ${tone.fill} ${getWidthClass(Math.max(relative, 5))}`} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Activity Spotlight</div>
          <div className="mt-3 text-xl font-bold text-slate-900">{activeItem.activity}</div>
          <div className={`mt-2 text-sm font-semibold ${PALETTE[activeItem.idx % PALETTE.length].text}`}>
            {activeItem.unit || 'unit'}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: 'Monthly', value: activeItem.val.toLocaleString() },
              { label: 'Share',   value: `${((activeItem.val / total) * 100).toFixed(1)}%` },
              { label: 'Annual',  value: (activeItem.val * 12).toLocaleString() },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
