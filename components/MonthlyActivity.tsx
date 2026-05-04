'use client';

import { useEffect, useMemo, useState } from 'react';

export interface MonthlyRow {
  vlcode: string; village_name: string;
  activity: string; unit: string; monthly_quantity: string;
  [key: string]: string;
}

const COLORS = [
  { bg: '#fff0e8', border: '#f4b896', bar: '#e2711d', txt: '#b05010', ring: 'border-[#f4b896]' },
  { bg: '#fffbec', border: '#f5d78a', bar: '#c8920a', txt: '#8a6208', ring: 'border-[#f5d78a]' },
  { bg: '#eef3ff', border: '#b8ccf4', bar: '#3460c8', txt: '#2040a0', ring: 'border-[#b8ccf4]' },
  { bg: '#f8eeff', border: '#d0a8f4', bar: '#7830c8', txt: '#5020a0', ring: 'border-[#d0a8f4]' },
  { bg: '#ffecf0', border: '#f4a0b0', bar: '#d01840', txt: '#a01030', ring: 'border-[#f4a0b0]' },
  { bg: '#edfaf3', border: '#96dbb4', bar: '#1a8a50', txt: '#106030', ring: 'border-[#96dbb4]' },
  { bg: '#ecfcfc', border: '#8cd8d8', bar: '#0a8a90', txt: '#066066', ring: 'border-[#8cd8d8]' },
  { bg: '#fef4ec', border: '#f0c090', bar: '#d06010', txt: '#904008', ring: 'border-[#f0c090]' },
  { bg: '#f4f0ff', border: '#c4b4f0', bar: '#5040a0', txt: '#3020a0', ring: 'border-[#c4b4f0]' },
  { bg: '#edfaf3', border: '#8cdcc0', bar: '#0a7060', txt: '#064840', ring: 'border-[#8cdcc0]' },
];

const KNOWN = new Set(['vlcode','village_name','activity','unit','monthly_quantity']);

function badge(a: string) { return a.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 4); }
function trunc(s: string, n = 28) { return s.length > n ? s.slice(0, n) + '…' : s; }

export default function MonthlyActivity({ rows }: { rows: MonthlyRow[] | null | undefined }) {
  const [narrow, setNarrow] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 640);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const items = useMemo(() => {
    const m = new Map<string, { unit: string; val: number; idx: number; extras: Record<string,string> }>();
    let idx = 0;
    (rows || []).forEach(r => {
      const v = parseFloat(r.monthly_quantity || '0') || 0;
      if (v <= 0) return;
      const extras: Record<string,string> = {};
      Object.entries(r).forEach(([k, val]) => { if (!KNOWN.has(k) && val?.trim()) extras[k] = val; });
      if (m.has(r.activity)) { m.get(r.activity)!.val += v; }
      else m.set(r.activity, { unit: r.unit, val: v, idx: idx++, extras });
    });
    return Array.from(m.entries()).map(([activity, d]) => ({ activity, ...d })).sort((a, b) => b.val - a.val);
  }, [rows]);

  if (!items.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-12 text-center text-sm text-[#6b6860]">No monthly data</div>
  );

  const total  = items.reduce((s, i) => s + i.val, 0);
  const shown  = items.slice(0, narrow ? 6 : 10);
  const maxVal = Math.max(...shown.map(i => i.val), 1);
  const active = items.find(i => i.activity === picked) || items[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      {/* header */}
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Monthly Activity</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">Consumption by activity · extra columns auto-rendered</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Total / Mo.', v: total.toLocaleString() },
            { l: 'Annual Est.', v: (total * 12).toLocaleString() },
            { l: 'Activities',  v: String(items.length) },
          ].map(c => (
            <div key={c.l} className="rounded-xl border border-[#e4e2dd] bg-white px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">{c.l}</p>
              <p className="mt-0.5 text-lg font-black text-[#1a1a1a]">{c.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          {/* list */}
          <div className="space-y-2">
            {shown.map(item => {
              const c = COLORS[item.idx % COLORS.length];
              const share = total > 0 ? (item.val / total) * 100 : 0;
              const rel   = (item.val / maxVal) * 100;
              const isAct = active.activity === item.activity;
              return (
                <button key={item.activity} type="button"
                  onClick={() => setPicked(item.activity === picked ? null : item.activity)}
                  style={isAct ? { borderColor: c.border, background: c.bg } : undefined}
                  className={`w-full rounded-xl border p-3.5 text-left transition-all ${isAct ? '' : 'border-[#e4e2dd] bg-white hover:border-[#c8c5be]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                      style={{ background: isAct ? '#fff' : c.bg, borderColor: c.border, color: c.txt }}>
                      {badge(item.activity)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1a1a1a]">{trunc(item.activity)}</span>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black" style={{ color: c.txt }}>{item.val.toLocaleString()}</p>
                      <p className="text-[10px] text-[#6b6860]">{item.unit || 'unit'} · {share.toFixed(1)}%</p>
                    </div>
                  </div>
                  {/* bar */}
                  <div className="mt-2.5 h-1.5 rounded-full bg-[#eceae5]">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(rel, 4)}%`, background: c.bar }} />
                  </div>
                  {/* extra fields auto-shown */}
                  {isAct && Object.entries(item.extras).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(item.extras).map(([k, v]) => (
                        <span key={k} className="rounded-full border border-[#e4e2dd] bg-white px-2 py-0.5 text-[9px] text-[#6b6860]">
                          {k.replace(/_/g,' ')}: {v}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* spotlight */}
          <div className="rounded-xl border border-[#e4e2dd] bg-[#f8f7f4] p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">Activity Spotlight</p>
            <p className="mt-2 text-base font-black leading-tight text-[#1a1a1a]">{active.activity}</p>
            <p className="mt-0.5 text-xs font-semibold" style={{ color: COLORS[active.idx % COLORS.length].txt }}>
              {active.unit || 'unit'}
            </p>
            {Object.entries(active.extras).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(active.extras).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px]">
                    <span className="text-[#6b6860]">{k.replace(/_/g,' ')}</span>
                    <span className="font-semibold text-[#1a1a1a]">{v}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 gap-2">
              {[
                { l: 'Monthly',  v: active.val.toLocaleString() },
                { l: 'Share',    v: `${((active.val / total) * 100).toFixed(1)}%` },
                { l: 'Annual',   v: (active.val * 12).toLocaleString() },
              ].map(c => (
                <div key={c.l} className="rounded-lg border border-[#e4e2dd] bg-white px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">{c.l}</p>
                  <p className="mt-0.5 text-lg font-black" style={{ color: COLORS[active.idx % COLORS.length].txt }}>{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
