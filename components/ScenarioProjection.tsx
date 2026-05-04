'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export interface ScenarioRow {
  vlcode: string;
  village_name: string;
  year: string;
  business_as_usual: string;
  line_of_sight: string;
  accelerated: string;
  [key: string]: string;
}

function n(v: string) { const x = parseFloat(v || '0'); return isFinite(x) ? x : 0; }

const SCENARIO_DEFS = {
  business_as_usual: { label: 'Business as Usual', short: 'BAU', color: '#d01840', dash: 'solid' as const,  border: 'border-[#f4a0b0]', bg: 'bg-[#ffecf0]', txt: 'text-[#a01030]', sub: 'text-[#c03050]' },
  line_of_sight:     { label: 'Line of Sight',      short: 'LOS', color: '#c8920a', dash: 'dash'  as const,  border: 'border-[#f5d78a]', bg: 'bg-[#fffbec]', txt: 'text-[#8a6208]', sub: 'text-[#a07010]' },
  accelerated:       { label: 'Accelerated',         short: 'ACC', color: '#1a8a50', dash: 'dot'   as const,  border: 'border-[#96dbb4]', bg: 'bg-[#edfaf3]', txt: 'text-[#106030]', sub: 'text-[#1a8a50]' },
};
const SCENARIO_KEYS = Object.keys(SCENARIO_DEFS) as (keyof typeof SCENARIO_DEFS)[];

export default function ScenarioProjection({ rows }: { rows: ScenarioRow[] | null | undefined }) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 640);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  if (!rows?.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-12 text-center text-sm text-[#6b6860]">No scenario data</div>
  );

  const first = rows[0];
  const activeKeys = SCENARIO_KEYS.filter(k => k in first);
  const years = rows.map(r => r.year);
  const lastIdx = years.length - 1;
  const lastYear = years[lastIdx];

  const series = activeKeys.map(k => {
    const def = SCENARIO_DEFS[k];
    const vals = rows.map(r => n(r[k]) / 1000);
    return { k, def, vals, last: vals[lastIdx] || 0 };
  });

  const bauLast = series.find(s => s.k === 'business_as_usual')?.last || 0;
  const accLast = series.find(s => s.k === 'accelerated')?.last || 0;

  const plotData = series.map(({ def, vals }) => ({
    x: years, y: vals,
    type: 'scatter', mode: 'lines+markers', name: def.label,
    line: { color: def.color, width: 2.5, dash: def.dash },
    marker: { size: 6, color: def.color, line: { color: 'white', width: 1.5 } },
    hovertemplate: `<b>%{x}</b><br>${def.short}: %{y:.1f} t<extra></extra>`,
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
        <p className="mt-0.5 text-xs text-[#6b6860]">Year-wise pathways · scenarios auto-detected from CSV</p>
      </div>
      <div className="p-5 md:p-6 space-y-5">
        {/* KPI cards — only renders scenarios present in the data */}
        <div className="grid gap-3 sm:grid-cols-3">
          {series.map(({ k, def, last }) => (
            <div key={k} className={`rounded-xl border px-4 py-3 ${def.border} ${def.bg}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${def.sub}`}>{def.short} · {lastYear}</p>
              <p className={`mt-1 text-2xl font-black ${def.txt}`}>{last.toFixed(1)}</p>
              <p className={`text-[10px] ${def.sub}`}>{def.label}</p>
            </div>
          ))}
          {bauLast > 0 && accLast > 0 && (
            <div className="rounded-xl border border-[#96dbb4] bg-[#edfaf3] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#1a8a50]">Max Reduction</p>
              <p className="mt-1 text-2xl font-black text-[#106030]">{(bauLast - accLast).toFixed(1)} t</p>
              <p className="text-[10px] text-[#1a8a50]">BAU vs ACC</p>
            </div>
          )}
        </div>

        {/* chart */}
        <div className="min-h-[320px] rounded-xl border border-[#e4e2dd] bg-white p-3 md:min-h-[380px]">
          <Plot data={plotData as never[]} layout={layout as never}
            config={{ responsive: true, displayModeBar: false }}
            className="h-full w-full" useResizeHandler />
        </div>
      </div>
    </div>
  );
}
