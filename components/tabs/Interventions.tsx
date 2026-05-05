'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ReductionRow {
  vlcode: string; village_name: string; sector: string; intervention: string;
  activity_reduction: string; emission_factor: string; annual_co2_reduction_kg: string;
  [key: string]: string;
}

const COLORS = [
  { bar: '#e2711d', pill: 'bg-[#fff0e8] text-[#b05010] border-[#f4b896]', card: 'border-[#f4b896] bg-[#fff8f4]', txt: '#b05010' },
  { bar: '#c8920a', pill: 'bg-[#fffbec] text-[#8a6208] border-[#f5d78a]', card: 'border-[#f5d78a] bg-[#fffef4]', txt: '#8a6208' },
  { bar: '#3460c8', pill: 'bg-[#eef3ff] text-[#2040a0] border-[#b8ccf4]', card: 'border-[#b8ccf4] bg-[#f4f6ff]', txt: '#2040a0' },
  { bar: '#1a8a50', pill: 'bg-[#edfaf3] text-[#106030] border-[#96dbb4]', card: 'border-[#96dbb4] bg-[#f4fbf7]', txt: '#106030' },
  { bar: '#7830c8', pill: 'bg-[#f8eeff] text-[#5020a0] border-[#d0a8f4]', card: 'border-[#d0a8f4] bg-[#fdf4ff]', txt: '#5020a0' },
  { bar: '#d01840', pill: 'bg-[#ffecf0] text-[#a01030] border-[#f4a0b0]', card: 'border-[#f4a0b0] bg-[#fff4f6]', txt: '#a01030' },
  { bar: '#0a8a90', pill: 'bg-[#ecfcfc] text-[#066066] border-[#8cd8d8]', card: 'border-[#8cd8d8] bg-[#f4fcfc]', txt: '#066066' },
  { bar: '#d06010', pill: 'bg-[#fef4ec] text-[#904008] border-[#f0c090]', card: 'border-[#f0c090] bg-[#fefaf4]', txt: '#904008' },
];

function toNum(v: string) { const n = parseFloat(v || '0'); return isFinite(n) ? n : 0; }
function trunc(s: string, n = 18) { return s.length > n ? s.slice(0, n) + '…' : s; }
const KNOWN = new Set(['vlcode','village_name','sector','intervention','activity_reduction','emission_factor','annual_co2_reduction_kg']);

function InterventionsChart({ rows }: { rows: ReductionRow[] }) {
  const [narrow, setNarrow]     = useState(false);
  const [selSector, setSector]  = useState<string | null>(null);

  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 640);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const items = useMemo(() => rows.filter(r => r.sector || r.intervention), [rows]);
  const sectorIdx = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach(r => { if (!m.has(r.sector)) m.set(r.sector, m.size); });
    return m;
  }, [items]);

  if (!items.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-12 text-center text-sm text-[#6b6860]">No intervention data</div>
  );

  const total    = items.reduce((s, r) => s + toNum(r.annual_co2_reduction_kg) / 1000, 0);
  const sectors  = Array.from(new Set(items.map(r => r.sector))).filter(Boolean);
  const filtered = selSector ? items.filter(r => r.sector === selSector) : items;

  const plotData = [{
    x: filtered.map(r => trunc(r.intervention || 'Unknown', narrow ? 10 : 16)),
    y: filtered.map(r => toNum(r.annual_co2_reduction_kg) / 1000),
    type: 'bar', name: 'CO₂ Reduction',
    marker: {
      color: filtered.map(r => COLORS[(sectorIdx.get(r.sector) ?? 0) % COLORS.length].bar),
      line:  { color: filtered.map(r => COLORS[(sectorIdx.get(r.sector) ?? 0) % COLORS.length].bar), width: 0 },
    },
    hovertemplate: '<b>%{x}</b><br>%{y:.3f} t/yr<extra></extra>',
  }];

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: '#ffffff',
    margin: { l: narrow ? 42 : 56, r: 12, t: 12, b: narrow ? 80 : 96 },
    bargap: 0.3, hovermode: 'closest', showlegend: false,
    xaxis: { tickangle: -30, automargin: true, tickfont: { color: '#6b6860', size: narrow ? 9 : 10 }, gridcolor: '#f0ede8', linecolor: '#e4e2dd' },
    yaxis: { title: { text: 'CO₂ Reduction (t/yr)', font: { color: '#6b6860', size: 11 } }, tickfont: { color: '#6b6860', size: 10 }, gridcolor: '#f0ede8', zeroline: true, zerolinecolor: '#e4e2dd' },
    font: { family: 'system-ui, sans-serif', color: '#1a1a1a' },
    autosize: true,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Intervention Reductions</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">Annual CO₂ savings · sectors auto-detected from CSV</p>
        </div>
        <div className="rounded-xl border border-[#96dbb4] bg-[#edfaf3] px-5 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#106030]">Total Saved</p>
          <p className="mt-0.5 text-2xl font-black text-[#1a8a50]">{total.toFixed(1)}</p>
          <p className="text-[10px] text-[#106030]">t CO₂e / yr</p>
        </div>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setSector(null)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${!selSector ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-[#e4e2dd] bg-white text-[#6b6860] hover:border-[#1a1a1a]'}`}>
            All
          </button>
          {sectors.map(s => {
            const c = COLORS[(sectorIdx.get(s) ?? 0) % COLORS.length];
            return (
              <button key={s} type="button" onClick={() => setSector(selSector === s ? null : s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${selSector === s ? c.pill : 'border-[#e4e2dd] bg-white text-[#6b6860] hover:border-[#1a1a1a]'}`}>
                {s}
              </button>
            );
          })}
        </div>

        <div className="min-h-[280px] rounded-xl border border-[#e4e2dd] bg-white p-2 md:min-h-[340px]">
          <Plot data={plotData as never[]} layout={layout as never}
            config={{ responsive: true, displayModeBar: false }}
            className="h-full w-full" useResizeHandler />
        </div>

        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">Intervention Details</p>
          <div className="space-y-2">
            {filtered.map((r, i) => {
              const c      = COLORS[(sectorIdx.get(r.sector) ?? 0) % COLORS.length];
              const extras = Object.entries(r).filter(([k]) => !KNOWN.has(k) && r[k]?.trim());
              return (
                <div key={i} className={`overflow-hidden rounded-xl border p-4 ${c.card}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#1a1a1a]">{r.intervention || '—'}</p>
                      <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${c.pill}`}>{r.sector}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[
                        { l: 'CO₂ Saved', v: `${(toNum(r.annual_co2_reduction_kg) / 1000).toFixed(3)} t` },
                        { l: 'Activity Δ', v: toNum(r.activity_reduction).toFixed(2) },
                        { l: 'EF',         v: toNum(r.emission_factor).toFixed(4) },
                        ...extras.map(([k, v]) => ({ l: k.replace(/_/g,' '), v })),
                      ].map(card => (
                        <div key={card.l} className="rounded-lg border border-white bg-white px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">{card.l}</p>
                          <p className="mt-0.5 text-sm font-black" style={{ color: c.txt }}>{card.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

export default function Interventions({ vlcode }: { vlcode: string }) {
  const [rows, setRows]       = useState<ReductionRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vlcode) return;
    setLoading(true);
    fetch(`/api/reductions?vlcode=${vlcode}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .finally(() => setLoading(false));
  }, [vlcode]);

  if (loading) return <Spinner />;
  return <InterventionsChart rows={rows || []} />;
}
