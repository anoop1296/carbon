'use client';

import { useEffect, useMemo, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────
interface MonthlyRow {
  vlcode: string; village_name: string;
  activity: string; unit: string; monthly_quantity: string;
  [key: string]: string;
}
interface FactorRow {
  category: string; emission_factor: string; source: string;
  [key: string]: string;
}

// ── Palettes ──────────────────────────────────────────────────────────────
const MONTHLY_COLORS = [
  { bg: '#fff0e8', border: '#f4b896', bar: '#e2711d', txt: '#b05010' },
  { bg: '#fffbec', border: '#f5d78a', bar: '#c8920a', txt: '#8a6208' },
  { bg: '#eef3ff', border: '#b8ccf4', bar: '#3460c8', txt: '#2040a0' },
  { bg: '#f8eeff', border: '#d0a8f4', bar: '#7830c8', txt: '#5020a0' },
  { bg: '#ffecf0', border: '#f4a0b0', bar: '#d01840', txt: '#a01030' },
  { bg: '#edfaf3', border: '#96dbb4', bar: '#1a8a50', txt: '#106030' },
  { bg: '#ecfcfc', border: '#8cd8d8', bar: '#0a8a90', txt: '#066066' },
  { bg: '#fef4ec', border: '#f0c090', bar: '#d06010', txt: '#904008' },
  { bg: '#f4f0ff', border: '#c4b4f0', bar: '#5040a0', txt: '#3020a0' },
  { bg: '#edfaf3', border: '#8cdcc0', bar: '#0a7060', txt: '#064840' },
];

const SOURCE_STYLES: Record<string, { pill: string; val: string }> = {
  'IPCC 2006': { pill: 'bg-[#eef3ff] text-[#2040a0] border-[#b8ccf4]', val: 'text-[#2040a0]' },
  'CEA India': { pill: 'bg-[#fff0e8] text-[#b05010] border-[#f4b896]', val: 'text-[#b05010]' },
  'CPCB':      { pill: 'bg-[#f8eeff] text-[#5020a0] border-[#d0a8f4]', val: 'text-[#5020a0]' },
  'EX-ACT':    { pill: 'bg-[#edfaf3] text-[#106030] border-[#96dbb4]', val: 'text-[#106030]' },
};
const FALLBACK_PILLS = [
  'bg-[#eef3ff] text-[#2040a0] border-[#b8ccf4]',
  'bg-[#fff0e8] text-[#b05010] border-[#f4b896]',
  'bg-[#f8eeff] text-[#5020a0] border-[#d0a8f4]',
  'bg-[#edfaf3] text-[#106030] border-[#96dbb4]',
  'bg-[#fffbec] text-[#8a6208] border-[#f5d78a]',
  'bg-[#ecfcfc] text-[#066066] border-[#8cd8d8]',
];

const KNOWN_MONTHLY = new Set(['vlcode','village_name','activity','unit','monthly_quantity']);
const KNOWN_FACTOR  = new Set(['category','emission_factor','source']);

function badge(a: string) { return a.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 4); }
function trunc(s: string, n = 28) { return s.length > n ? s.slice(0, n) + '…' : s; }

// ── Monthly Activity chart ────────────────────────────────────────────────
function MonthlyChart({ rows }: { rows: MonthlyRow[] }) {
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
    rows.forEach(r => {
      const v = parseFloat(r.monthly_quantity || '0') || 0;
      if (v <= 0) return;
      const extras: Record<string,string> = {};
      Object.entries(r).forEach(([k, val]) => { if (!KNOWN_MONTHLY.has(k) && val?.trim()) extras[k] = val; });
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
          <div className="space-y-2">
            {shown.map(item => {
              const c     = MONTHLY_COLORS[item.idx % MONTHLY_COLORS.length];
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
                  <div className="mt-2.5 h-1.5 rounded-full bg-[#eceae5]">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(rel, 4)}%`, background: c.bar }} />
                  </div>
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

          <div className="rounded-xl border border-[#e4e2dd] bg-[#f8f7f4] p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">Activity Spotlight</p>
            <p className="mt-2 text-base font-black leading-tight text-[#1a1a1a]">{active.activity}</p>
            <p className="mt-0.5 text-xs font-semibold" style={{ color: MONTHLY_COLORS[active.idx % MONTHLY_COLORS.length].txt }}>
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
                { l: 'Monthly', v: active.val.toLocaleString() },
                { l: 'Share',   v: `${((active.val / total) * 100).toFixed(1)}%` },
                { l: 'Annual',  v: (active.val * 12).toLocaleString() },
              ].map(c => (
                <div key={c.l} className="rounded-lg border border-[#e4e2dd] bg-white px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">{c.l}</p>
                  <p className="mt-0.5 text-lg font-black" style={{ color: MONTHLY_COLORS[active.idx % MONTHLY_COLORS.length].txt }}>{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Emission Factors table ────────────────────────────────────────────────
function FactorsTable({ rows }: { rows: FactorRow[] }) {
  if (!rows.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-10 text-center text-sm text-[#6b6860]">No emission factors</div>
  );

  const sources   = Array.from(new Set(rows.map(r => r.source).filter(Boolean)));
  const srcIdx    = new Map(sources.map((s, i) => [s, i]));
  const extraCols = Object.keys(rows[0]).filter(k => !KNOWN_FACTOR.has(k));

  function getStyle(source: string) {
    return SOURCE_STYLES[source] || { pill: FALLBACK_PILLS[(srcIdx.get(source) ?? 0) % FALLBACK_PILLS.length], val: 'text-[#2040a0]' };
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Emission Factors</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">Reference values · {rows.length} entries · extra columns auto-rendered</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sources.map(s => {
            const st = getStyle(s);
            return <span key={s} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.pill}`}>{s}</span>;
          })}
        </div>
      </div>
      <div className="divide-y divide-[#f4f2ee]">
        {rows.map((row, i) => {
          const st     = getStyle(row.source);
          const abbrev = row.category?.match(/\b\w/g)?.join('').toUpperCase().slice(0, 3) || row.category?.slice(0, 3).toUpperCase() || '—';
          return (
            <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f8f7f4]">
              <span className={`inline-flex min-w-10 justify-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${st.pill}`}>{abbrev}</span>
              <span className="min-w-[130px] flex-1 text-sm font-bold text-[#1a1a1a]">{row.category}</span>
              <span className={`text-sm font-black ${st.val}`}>{row.emission_factor}</span>
              {extraCols.map(col => <span key={col} className="text-xs text-[#6b6860]">{row[col]}</span>)}
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.pill}`}>{row.source}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d8f3dc] border-t-[#2d6a4f]" />
    </div>
  );
}

// ── Tab export ────────────────────────────────────────────────────────────
export default function Activity({ vlcode }: { vlcode: string }) {
  const [monthly, setMonthly]   = useState<MonthlyRow[] | null>(null);
  const [factors, setFactors]   = useState<FactorRow[] | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!vlcode) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/monthly?vlcode=${vlcode}`, { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/emission-factors', { cache: 'no-store' }).then(r => r.json()),
    ])
      .then(([mon, fac]) => { setMonthly(mon.data || []); setFactors(fac.data || []); })
      .finally(() => setLoading(false));
  }, [vlcode]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-5">
      <MonthlyChart rows={monthly || []} />
      <FactorsTable rows={factors || []} />
    </div>
  );
}
