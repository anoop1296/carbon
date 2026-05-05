'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type ScenarioRow = Record<string, string>;

function n(v: string) { const x = parseFloat(v || '0'); return isFinite(x) ? x : 0; }

const PALETTE = [
  { color: '#d01840', dash: 'solid'   as const, bg: 'bg-[#ffecf0]', border: 'border-[#f4a0b0]', txt: 'text-[#a01030]', sub: 'text-[#c03050]' },
  { color: '#c8920a', dash: 'dash'    as const, bg: 'bg-[#fffbec]', border: 'border-[#f5d78a]', txt: 'text-[#8a6208]', sub: 'text-[#a07010]' },
  { color: '#1a8a50', dash: 'dot'     as const, bg: 'bg-[#edfaf3]', border: 'border-[#96dbb4]', txt: 'text-[#106030]', sub: 'text-[#1a8a50]' },
  { color: '#3460c8', dash: 'dashdot' as const, bg: 'bg-[#eef3ff]', border: 'border-[#b8ccf4]', txt: 'text-[#2040a0]', sub: 'text-[#3460c8]' },
  { color: '#7830c8', dash: 'solid'   as const, bg: 'bg-[#f8eeff]', border: 'border-[#d0a8f4]', txt: 'text-[#5020a0]', sub: 'text-[#7830c8]' },
];

function toLabel(key: string) { return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function ScenarioChart({ rows }: { rows: ScenarioRow[] }) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 640);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  if (!rows.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-12 text-center text-sm text-[#6b6860]">No scenario data</div>
  );

  const identity = new Set(['vlcode', 'village_name', 'year']);
  const scenarioKeys = Object.keys(rows[0]).filter(k => !identity.has(k));

  if (!scenarioKeys.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-12 text-center text-sm text-[#6b6860]">No scenario columns detected</div>
  );

  const years    = Array.from(new Set(rows.map(r => r.year))).sort();
  const lastYear = years[years.length - 1];

  const series = scenarioKeys.map((key, i) => {
    const p    = PALETTE[i % PALETTE.length];
    const vals = years.map(yr => { const r = rows.find(r => r.year === yr); return r ? n(r[key]) / 1000 : 0; });
    return { key, label: toLabel(key), p, vals, last: vals[vals.length - 1] || 0 };
  });

  const firstLast = series[0]?.last || 0;
  const lastLast  = series[series.length - 1]?.last || 0;
  const maxReduction = firstLast > 0 && lastLast < firstLast ? firstLast - lastLast : null;

  const plotData = series.map(({ label, p, vals }) => ({
    x: years, y: vals,
    type: 'scatter', mode: 'lines+markers', name: label,
    line: { color: p.color, width: 2.5, dash: p.dash },
    marker: { size: 6, color: p.color, line: { color: 'white', width: 1.5 } },
    hovertemplate: `<b>%{x}</b><br>${label}: %{y:.1f} t<extra></extra>`,
  }));

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: '#ffffff',
    margin: { l: narrow ? 42 : 58, r: 16, t: narrow ? 36 : 20, b: narrow ? 50 : 56 },
    hovermode: 'x unified',
    legend: { orientation: 'h', x: 0, xanchor: 'left', y: narrow ? 1.14 : 1.1, font: { color: '#4a4840', size: 11 }, bgcolor: 'rgba(0,0,0,0)' },
    xaxis: { title: { text: 'Year', font: { color: '#6b6860', size: 11 } }, tickfont: { color: '#6b6860', size: 10 }, gridcolor: '#f0ede8', linecolor: '#e4e2dd', zeroline: false },
    yaxis: { title: { text: 'CO₂e (t/yr)', font: { color: '#6b6860', size: 11 } }, tickfont: { color: '#6b6860', size: 10 }, gridcolor: '#f0ede8', linecolor: '#e4e2dd', zeroline: false },
    font: { family: 'system-ui, sans-serif', color: '#1a1a1a' },
    autosize: true,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4">
        <h3 className="text-lg font-black text-[#1a1a1a]">Scenario Projections</h3>
        <p className="mt-0.5 text-xs text-[#6b6860]">Year-wise pathways · {scenarioKeys.length} scenario{scenarioKeys.length !== 1 ? 's' : ''} auto-detected</p>
      </div>
      <div className="space-y-5 p-5 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {series.map(({ key, label, p, last }) => (
            <div key={key} className={`rounded-xl border px-4 py-3 ${p.border} ${p.bg}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${p.sub}`}>{lastYear}</p>
              <p className={`mt-1 text-2xl font-black ${p.txt}`}>{last.toFixed(1)}</p>
              <p className={`text-[10px] ${p.sub}`}>{label}</p>
            </div>
          ))}
          {maxReduction !== null && (
            <div className="rounded-xl border border-[#96dbb4] bg-[#edfaf3] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#1a8a50]">Max Reduction</p>
              <p className="mt-1 text-2xl font-black text-[#106030]">{maxReduction.toFixed(1)} t</p>
              <p className="text-[10px] text-[#1a8a50]">{series[0].label} vs {series[series.length - 1].label}</p>
            </div>
          )}
        </div>
        <div className="min-h-[320px] rounded-xl border border-[#e4e2dd] bg-white p-3 md:min-h-[380px]">
          <Plot data={plotData as never[]} layout={layout as never}
            config={{ responsive: true, displayModeBar: false }}
            className="h-full w-full" useResizeHandler />
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

export default function Scenarios({ vlcode }: { vlcode: string }) {
  const [rows, setRows]       = useState<ScenarioRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vlcode) return;
    setLoading(true);
    fetch(`/api/scenario?vlcode=${vlcode}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .finally(() => setLoading(false));
  }, [vlcode]);

  if (loading) return <Spinner />;
  return <ScenarioChart rows={rows || []} />;
}
