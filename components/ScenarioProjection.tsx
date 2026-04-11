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
}

function toNum(v: string): number {
  const n = parseFloat(v || '0');
  return Number.isFinite(n) ? n : 0;
}

export default function ScenarioProjection({ rows }: { rows: ScenarioRow[] | null | undefined }) {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        No scenario data available
      </div>
    );
  }

  const years = rows.map((row) => row.year);
  const bau = rows.map((row) => toNum(row.business_as_usual) / 1000);
  const los = rows.map((row) => toNum(row.line_of_sight) / 1000);
  const acc = rows.map((row) => toNum(row.accelerated) / 1000);
  const finalIndex = Math.max(years.length - 1, 0);
  const finalYear = years[finalIndex];
  const bauFinal = bau[finalIndex] || 0;
  const losFinal = los[finalIndex] || 0;
  const accFinal = acc[finalIndex] || 0;
  const bestDrop = bauFinal - accFinal;

  const data = [
    {
      x: years,
      y: bau,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Business as Usual',
      line: { color: '#ef4444', width: 3 },
      marker: { size: 7, color: '#ef4444' },
      hovertemplate: 'Year: %{x}<br>BAU: %{y:.2f} t<extra></extra>',
    },
    {
      x: years,
      y: los,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Line of Sight',
      line: { color: '#f59e0b', width: 3, dash: 'dash' },
      marker: { size: 7, color: '#f59e0b' },
      hovertemplate: 'Year: %{x}<br>LoS: %{y:.2f} t<extra></extra>',
    },
    {
      x: years,
      y: acc,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Accelerated',
      line: { color: '#10b981', width: 3, dash: 'dot' },
      marker: { size: 7, color: '#10b981' },
      hovertemplate: 'Year: %{x}<br>ACC: %{y:.2f} t<extra></extra>',
    },
  ];

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#ffffff',
    margin: { l: isNarrow ? 44 : 68, r: isNarrow ? 16 : 28, t: isNarrow ? 34 : 22, b: isNarrow ? 52 : 60 },
    hovermode: 'x unified',
    legend: {
      orientation: 'h',
      x: 0,
      xanchor: 'left',
      y: isNarrow ? 1.12 : 1.1,
      font: { color: '#475569', size: isNarrow ? 10 : 12 },
    },
    xaxis: {
      title: { text: 'Year', font: { color: '#475569', size: isNarrow ? 11 : 13 } },
      tickfont: { color: '#475569', size: isNarrow ? 10 : 12 },
      gridcolor: '#e2e8f0',
      zeroline: false,
      linecolor: '#cbd5e1',
    },
    yaxis: {
      title: { text: 'CO2e (tons/year)', font: { color: '#475569', size: isNarrow ? 11 : 13 } },
      tickfont: { color: '#475569', size: isNarrow ? 10 : 12 },
      gridcolor: '#e2e8f0',
      zeroline: false,
      linecolor: '#cbd5e1',
    },
    font: { color: '#0f172a', family: 'system-ui, sans-serif' },
    autosize: true,
  };

  const config = {
    responsive: true,
    displayModeBar: false,
    displaylogo: false,
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">Scenario Projection</h3>
        <p className="mt-1 text-sm text-slate-500">
          Year-wise comparison across baseline and intervention pathways
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600">
            BAU {finalYear}
          </div>
          <div className="mt-1 text-xl font-bold text-red-700">{bauFinal.toFixed(2)} t</div>
          <div className="text-xs text-red-500">business as usual</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600">
            LOS {finalYear}
          </div>
          <div className="mt-1 text-xl font-bold text-amber-700">{losFinal.toFixed(2)} t</div>
          <div className="text-xs text-amber-500">line of sight</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
            Best Drop
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-700">{bestDrop.toFixed(2)} t</div>
          <div className="text-xs text-emerald-500">BAU vs accelerated</div>
        </div>
      </div>

      <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-white p-3 md:min-h-[380px] md:p-4">
        <Plot
          data={data as never[]}
          layout={layout as never}
          config={config as never}
          className="h-full w-full"
          useResizeHandler
        />
      </div>
    </section>
  );
}
