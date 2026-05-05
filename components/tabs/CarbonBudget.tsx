'use client';

import { useEffect, useMemo, useState } from 'react';

interface BudgetRow {
  vlcode: string; village_name: string;
  parameter: string; value: string; unit?: string;
}

const COLORS = ['#990606','#c8920a','#3460c8','#1a8a50','#7830c8','#d01840','#0a8a90','#d06010','#2d6a4f','#b05010'];
const PILL = [
  'bg-[#fff0e8] text-[#b05010] border-[#f4b896]',
  'bg-[#fffbec] text-[#8a6208] border-[#f5d78a]',
  'bg-[#eef3ff] text-[#2040a0] border-[#b8ccf4]',
  'bg-[#edfaf3] text-[#106030] border-[#96dbb4]',
  'bg-[#f8eeff] text-[#5020a0] border-[#d0a8f4]',
  'bg-[#ffecf0] text-[#a01030] border-[#f4a0b0]',
  'bg-[#ecfcfc] text-[#066066] border-[#8cd8d8]',
  'bg-[#fef4ec] text-[#904008] border-[#f0c090]',
];

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(cx: number, cy: number, R: number, ri: number, s: number, e: number) {
  const A = polarXY(cx, cy, R, s), B = polarXY(cx, cy, R, e);
  const C = polarXY(cx, cy, ri, e), D = polarXY(cx, cy, ri, s);
  const lg = e - s > 180 ? 1 : 0;
  return [`M${A.x} ${A.y}`, `A${R} ${R} 0 ${lg} 1 ${B.x} ${B.y}`, `L${C.x} ${C.y}`, `A${ri} ${ri} 0 ${lg} 0 ${D.x} ${D.y}`, 'Z'].join(' ');
}

type Slice = { label: string; value: number; color: string; i: number };

const norm = (p: string) => p.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const isBeforePie = (r: BudgetRow) => { const p = norm(r.parameter); return p === 'net_emission' || p === 'total_sequestration'; };
const isAfterPie  = (r: BudgetRow) => { const p = norm(r.parameter); return p === 'total_emission_reduction' || p === 'total_sequestration_increase' || p === 'new_net_emission'; };
const toSlices = (rows: BudgetRow[]): Slice[] =>
  rows.length ? rows.map((r, i) => ({ label: r.parameter, value: Math.abs(parseFloat(r.value || '0')), color: COLORS[i % COLORS.length], i }))
              : [{ label: 'No Data', value: 1, color: '#e4e2dd', i: 0 }];

function Donut({ slices, label }: { slices: Slice[]; label: string }) {
  const [hov, setHov] = useState<number | null>(null);
  const total  = slices.reduce((s, x) => s + x.value, 0);
  const active = hov !== null ? slices[hov] : null;
  let angle = 0;
  const built = slices.map(sl => {
    const span = total > 0 ? (sl.value / total) * 360 : 0;
    const start = angle; angle += span;
    return { sl, start, end: angle };
  });
  return (
    <div className="rounded-xl border border-[#e4e2dd] bg-[#f8f7f4] p-4">
      <p className="mb-1 text-center text-xs font-bold text-[#6b6860]">{label}</p>
      <svg width="180" height="180" viewBox="0 0 180 180" className="mx-auto overflow-visible">
        {built.map(({ sl, start, end }, i) => end > start && (
          <path key={i} d={arc(90, 90, 72, 44, start, end)}
            fill={sl.color} opacity={hov !== null && hov !== i ? 0.3 : 1}
            stroke="#f8f7f4" strokeWidth="1.5"
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            className="cursor-pointer transition-opacity duration-150" />
        ))}
        <circle cx="90" cy="90" r="44" fill="white" stroke="#e4e2dd" strokeWidth="1" />
        <text x="90" y="83" textAnchor="middle" fontSize="8" fill="#6b6860" fontWeight="700" letterSpacing="0.5">
          {active ? active.label.slice(0, 12) : 'TOTAL'}
        </text>
        <text x="90" y="99" textAnchor="middle" fontSize="18" fill="#1a1a1a" fontWeight="900">
          {((active?.value || total) / 1000).toFixed(1)}
        </text>
        <text x="90" y="110" textAnchor="middle" fontSize="8" fill="#6b6860">t CO₂e</text>
      </svg>
    </div>
  );
}

function CarbonBudgetChart({ before, after }: { before: BudgetRow[] | null; after: BudgetRow[] | null }) {
  const bRows    = useMemo(() => (before || []).filter(r => parseFloat(r.value || '0') !== 0), [before]);
  const aRows    = useMemo(() => (after  || []).filter(r => parseFloat(r.value || '0') !== 0), [after]);
  const bPieRows = useMemo(() => bRows.filter(isBeforePie), [bRows]);
  const aPieRows = useMemo(() => aRows.filter(isAfterPie),  [aRows]);
  const bSlices  = useMemo(() => toSlices(bPieRows), [bPieRows]);
  const aSlices  = useMemo(() => toSlices(aPieRows), [aPieRows]);

  const bTotal    = bRows.reduce((s, r) => s + Math.abs(parseFloat(r.value || '0')), 0);
  const aTotal    = aRows.reduce((s, r) => s + Math.abs(parseFloat(r.value || '0')), 0);
  const bPieTotal = bSlices.reduce((s, x) => s + x.value, 0);
  const aPieTotal = aSlices.reduce((s, x) => s + x.value, 0);
  const redPct    = bTotal > 0 ? ((bTotal - aTotal) / bTotal) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Carbon Budget</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">All parameters auto-detected from CSV · before vs after</p>
        </div>
        {redPct !== 0 && (
          <div className={`rounded-xl border px-5 py-2.5 text-center ${redPct > 0 ? 'border-[#96dbb4] bg-[#edfaf3]' : 'border-[#f4a0b0] bg-[#ffecf0]'}`}>
            <p className={`text-[9px] font-bold uppercase tracking-widest ${redPct > 0 ? 'text-[#106030]' : 'text-[#a01030]'}`}>Reduction</p>
            <p className={`mt-0.5 text-2xl font-black ${redPct > 0 ? 'text-[#1a8a50]' : 'text-[#d01840]'}`}>{Math.abs(redPct).toFixed(1)}%</p>
          </div>
        )}
      </div>

      <div className="space-y-6 p-5 md:p-6">
        {(bRows.length > 0 || aRows.length > 0) && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {[...bRows, ...aRows].map((row, i) => {
              const val = Math.abs(parseFloat(row.value || '0'));
              return (
                <div key={i} className={`rounded-xl border px-4 py-3 ${PILL[i % PILL.length]}`}>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">{row.parameter.length > 18 ? row.parameter.slice(0, 18) + '…' : row.parameter}</p>
                  <p className="mt-2 text-xl font-black">{(val / 1000).toFixed(1)} t</p>
                  <p className="mt-0.5 text-[10px] opacity-60">CO₂e / yr</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {[
            { title: 'Baseline', rows: bRows, total: bTotal, accent: '#d01840', border: 'border-[#f4a0b0]', bg: 'bg-[#ffecf0]', hdr: 'border-[#f4b0be]' },
            { title: 'After Intervention', rows: aRows, total: aTotal, accent: '#1a8a50', border: 'border-[#96dbb4]', bg: 'bg-[#edfaf3]', hdr: 'border-[#aadfc0]' },
          ].map(({ title, rows, total: tot, accent, border, bg, hdr }) => (
            <div key={title} className={`overflow-hidden rounded-xl border ${border} ${bg}`}>
              <div className={`flex items-center justify-between border-b px-4 py-3 ${hdr}`}>
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: accent }}>{title}</span>
                <span className="text-lg font-black" style={{ color: accent }}>{(tot / 1000).toFixed(1)} t</span>
              </div>
              <div className="space-y-1.5 p-3">
                {rows.length === 0
                  ? <p className="py-4 text-center text-xs text-[#6b6860]">No data</p>
                  : rows.map((r, i) => {
                      const v = parseFloat(r.value || '0');
                      const sh = tot > 0 ? (Math.abs(v) / tot) * 100 : 0;
                      return (
                        <div key={i} className="rounded-lg border border-white/80 bg-white px-3 py-2.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-[#1a1a1a]">{r.parameter}</span>
                            <span className="font-black" style={{ color: accent }}>{(v / 1000).toFixed(2)} t</span>
                          </div>
                          <div className="mt-1.5 h-1 rounded-full bg-[#eceae5]">
                            <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${Math.max(sh, 3)}%`, background: accent }} />
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {[
            { slices: bSlices, total: bPieTotal, label: 'Baseline (Before)' },
            { slices: aSlices, total: aPieTotal, label: 'After Intervention' },
          ].map(({ slices, total: tot, label }) => (
            <div key={label} className="space-y-3">
              <Donut slices={slices} label={label} />
              <div className="space-y-1.5">
                {slices.map((sl, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg border border-[#e4e2dd] bg-[#f8f7f4] px-3 py-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: sl.color }} />
                    <span className="flex-1 truncate text-xs font-semibold text-[#1a1a1a]">{sl.label}</span>
                    <span className="text-xs font-black text-[#1a1a1a]">{tot > 0 ? ((sl.value / tot) * 100).toFixed(1) : 0}%</span>
                    <span className="text-xs text-[#6b6860]">{(sl.value / 1000).toFixed(1)} t</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d8f3dc] border-t-[#2d6a4f]" />
    </div>
  );
}

export default function CarbonBudget({ vlcode }: { vlcode: string }) {
  const [before, setBefore]   = useState<BudgetRow[] | null>(null);
  const [after, setAfter]     = useState<BudgetRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vlcode) return;
    setLoading(true);
    fetch(`/api/carbon-budget?vlcode=${vlcode}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setBefore(d.before || []); setAfter(d.after || []); })
      .finally(() => setLoading(false));
  }, [vlcode]);

  if (loading) return <Spinner />;
  return <CarbonBudgetChart before={before} after={after} />;
}
