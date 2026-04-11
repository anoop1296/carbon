'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export interface ReductionRow {
  vlcode: string;
  village_name: string;
  sector: string;
  intervention: string;
  activity_reduction: string;
  emission_factor: string;
  annual_co2_reduction_kg: string;
}

type Tone = 'orange' | 'amber' | 'blue' | 'emerald' | 'violet' | 'pink' | 'slate';

const SECTOR_META: Record<string, { tone: Tone; color: string }> = {
  Residential: { tone: 'orange', color: '#f97316' },
  Energy: { tone: 'amber', color: '#f59e0b' },
  Transport: { tone: 'blue', color: '#3b82f6' },
  Agriculture: { tone: 'emerald', color: '#10b981' },
  Waste: { tone: 'violet', color: '#8b5cf6' },
  Livestock: { tone: 'pink', color: '#ec4899' },
};

const TONE_CLASSES: Record<Tone, { pill: string; card: string; text: string }> = {
  orange: { pill: 'bg-orange-100 text-orange-700', card: 'bg-orange-50 border-orange-200', text: 'text-orange-600' },
  amber: { pill: 'bg-amber-100 text-amber-700', card: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
  blue: { pill: 'bg-blue-100 text-blue-700', card: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
  emerald: { pill: 'bg-emerald-100 text-emerald-700', card: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
  violet: { pill: 'bg-violet-100 text-violet-700', card: 'bg-violet-50 border-violet-200', text: 'text-violet-600' },
  pink: { pill: 'bg-pink-100 text-pink-700', card: 'bg-pink-50 border-pink-200', text: 'text-pink-600' },
  slate: { pill: 'bg-slate-100 text-slate-700', card: 'bg-slate-50 border-slate-200', text: 'text-slate-600' },
};

function toNum(v: string): number {
  const n = parseFloat(v || '0');
  return Number.isFinite(n) ? n : 0;
}

function shortLabel(text: string, limit = 18): string {
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export default function InterventionReductions({ rows }: { rows: ReductionRow[] | null | undefined }) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const items = useMemo(() => (rows || []).filter((row) => row.sector || row.intervention), [rows]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        No intervention data available
      </div>
    );
  }

  const totalTons = items.reduce((sum, row) => sum + toNum(row.annual_co2_reduction_kg) / 1000, 0);
  const sectors = Array.from(new Set(items.map((row) => row.sector))).filter(Boolean);
  const filtered = selectedSector ? items.filter((row) => row.sector === selectedSector) : items;

  const data = [
    {
      x: filtered.map((row) => shortLabel(row.intervention || 'Unknown', isNarrow ? 12 : 18)),
      y: filtered.map((row) => toNum(row.annual_co2_reduction_kg) / 1000),
      type: 'bar',
      name: 'Annual CO2 Reduction',
      marker: {
        color: filtered.map((row) => SECTOR_META[row.sector]?.color || '#94a3b8'),
        line: {
          color: filtered.map((row) => SECTOR_META[row.sector]?.color || '#94a3b8'),
          width: 1.5,
        },
      },
      hovertemplate: '<b>%{x}</b><br>CO2 Reduction: <b>%{y:.3f} t/yr</b><extra></extra>',
    },
  ];

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(248,250,252,1)',
    margin: { l: isNarrow ? 48 : 62, r: 16, t: 16, b: isNarrow ? 90 : 100 },
    bargap: 0.32,
    hovermode: 'closest',
    showlegend: false,
    xaxis: {
      tickangle: -30,
      automargin: true,
      tickfont: { color: '#475569', size: isNarrow ? 9 : 11, family: 'system-ui, sans-serif' },
      gridcolor: '#e2e8f0',
      linecolor: '#cbd5e1',
      tickcolor: '#cbd5e1',
    },
    yaxis: {
      title: { text: 'CO2 Reduction (t/yr)', font: { color: '#475569', size: isNarrow ? 10 : 12 } },
      tickfont: { color: '#475569', size: isNarrow ? 9 : 11, family: 'system-ui, sans-serif' },
      gridcolor: '#e2e8f0',
      zeroline: true,
      zerolinecolor: '#cbd5e1',
      linecolor: '#cbd5e1',
    },
    font: { color: '#0f172a', family: 'system-ui, sans-serif' },
    autosize: true,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toImage'],
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Intervention Reductions</h3>
          <p className="mt-1 text-sm text-slate-500">Annual CO2 savings per intervention</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Total Saved
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{totalTons.toFixed(1)} t</div>
          <div className="text-xs text-emerald-500">CO2e / yr</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedSector(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !selectedSector
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {sectors.map((sector) => {
          const tone = TONE_CLASSES[SECTOR_META[sector]?.tone || 'slate'];
          const isActive = selectedSector === sector;
          return (
            <button
              key={sector}
              type="button"
              onClick={() => setSelectedSector(isActive ? null : sector)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isActive ? tone.card : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sector}
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-[300px] rounded-2xl border border-slate-200 bg-slate-50 p-2 md:min-h-[360px]">
        <Plot
          data={data as never[]}
          layout={layout as never}
          config={config as never}
          className="h-full w-full"
          useResizeHandler
        />
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Intervention Details
        </div>
        <div className="mt-3 space-y-3">
          {filtered.map((row, index) => {
            const tone = TONE_CLASSES[SECTOR_META[row.sector]?.tone || 'slate'];
            return (
              <div
                key={`${row.intervention}-${index}`}
                className={`rounded-xl border p-4 ${tone.card}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {row.intervention || '-'}
                    </div>
                    <div
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.pill}`}
                    >
                      {row.sector}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        CO2 Saved
                      </div>
                      <div className={`mt-1 text-sm font-bold ${tone.text}`}>
                        {(toNum(row.annual_co2_reduction_kg) / 1000).toFixed(3)} t
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Activity Delta
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-900">
                        {toNum(row.activity_reduction).toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Emission Factor
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-900">
                        {toNum(row.emission_factor).toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
