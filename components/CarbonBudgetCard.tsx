'use client';

import { useMemo, useState } from 'react';

export interface BudgetRow {
  vlcode: string;
  village_name: string;
  parameter: string;
  value: string;
  unit?: string;
}

// Color palette cycled by parameter index
const DONUT_COLORS = [
  '#10b981', '#ef4444', '#3b82f6', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6',
];

const PILL_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
];

const DOT_COLORS = [
  'bg-emerald-500', 'bg-red-500', 'bg-blue-500', 'bg-amber-500',
  'bg-violet-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500',
  'bg-indigo-500', 'bg-teal-500',
];

const TEXT_COLORS = [
  'text-emerald-600', 'text-red-600', 'text-blue-600', 'text-amber-600',
  'text-violet-600', 'text-pink-600', 'text-cyan-600', 'text-orange-600',
  'text-indigo-600', 'text-teal-600',
];

const CARD_STYLES = [
  'bg-emerald-50 border-emerald-200',
  'bg-red-50 border-red-200',
  'bg-blue-50 border-blue-200',
  'bg-amber-50 border-amber-200',
  'bg-violet-50 border-violet-200',
  'bg-pink-50 border-pink-200',
  'bg-cyan-50 border-cyan-200',
  'bg-orange-50 border-orange-200',
  'bg-indigo-50 border-indigo-200',
  'bg-teal-50 border-teal-200',
];

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const os = polarXY(cx, cy, outerR, startDeg);
  const oe = polarXY(cx, cy, outerR, endDeg);
  const is = polarXY(cx, cy, innerR, endDeg);
  const ie = polarXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${is.x} ${is.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ie.x} ${ie.y}`,
    'Z',
  ].join(' ');
}

type Slice = { label: string; value: number; color: string; idx: number };

function DonutChart({ slices, title }: { slices: Slice[]; title: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 220;
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 14;
  const innerR = outerR * 0.62;
  const total  = slices.reduce((s, sl) => s + sl.value, 0);
  const active = hovered !== null ? slices[hovered] : null;

  let angle = 0;
  const built = slices.map((sl) => {
    const span  = total > 0 ? (sl.value / total) * 360 : 0;
    const start = angle;
    const end   = angle + span;
    angle += span;
    return { sl, start, end };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-center text-sm font-semibold text-slate-700">{title}</div>
      <svg width="220" height="220" viewBox="0 0 220 220" className="mx-auto mt-3 overflow-visible" role="img" aria-label={title}>
        {built.map(({ sl, start, end }, index) => {
          if (end <= start) return null;
          return (
            <path
              key={`${sl.label}-${index}`}
              d={donutPath(cx, cy, outerR, innerR, start, end)}
              fill={sl.color}
              opacity={hovered !== null && hovered !== index ? 0.35 : 1}
              stroke="#ffffff"
              strokeWidth="1"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer transition-opacity duration-200"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <text x={cx} y={cy - 10} textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold">
          {active ? active.label.slice(0, 12) : 'Total'}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-slate-900 text-[26px] font-bold">
          {((active?.value || total) / 1000).toFixed(1)}
        </text>
        <text x={cx} y={cy + 28} textAnchor="middle" className="fill-slate-500 text-[11px]">t CO2e</text>
      </svg>
    </div>
  );
}

function LegendItem({ label, value, total, idx }: { label: string; value: number; total: number; idx: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className={`h-3 w-3 rounded-md ${DOT_COLORS[idx % DOT_COLORS.length]}`} />
      <span className="flex-1 text-sm font-semibold text-slate-900">{label}</span>
      <span className={`text-xs font-bold ${TEXT_COLORS[idx % TEXT_COLORS.length]}`}>
        {total > 0 ? ((value / total) * 100).toFixed(1) : '0'}%
      </span>
      <span className="text-xs font-semibold text-slate-500">{(value / 1000).toFixed(1)} t</span>
    </div>
  );
}

export default function CarbonBudgetCard({
  before,
  after,
}: {
  before: BudgetRow[] | null | undefined;
  after: BudgetRow[] | null | undefined;
}) {
  const beforeRows = useMemo(
    () => (before || []).filter((r) => parseFloat(r.value || '0') !== 0),
    [before]
  );
  const afterRows = useMemo(
    () => (after || []).filter((r) => parseFloat(r.value || '0') !== 0),
    [after]
  );

  const beforeSlices = useMemo<Slice[]>(() =>
    beforeRows.length > 0
      ? beforeRows.map((r, i) => ({
          label: r.parameter,
          value: Math.abs(parseFloat(r.value || '0')),
          color: DONUT_COLORS[i % DONUT_COLORS.length],
          idx: i,
        }))
      : [{ label: 'No Data', value: 1, color: '#94a3b8', idx: 0 }],
  [beforeRows]);

  const afterSlices = useMemo<Slice[]>(() =>
    afterRows.length > 0
      ? afterRows.map((r, i) => ({
          label: r.parameter,
          value: Math.abs(parseFloat(r.value || '0')),
          color: DONUT_COLORS[i % DONUT_COLORS.length],
          idx: i,
        }))
      : [{ label: 'No Data', value: 1, color: '#94a3b8', idx: 0 }],
  [afterRows]);

  const beforeTotal = beforeSlices.reduce((s, sl) => s + sl.value, 0);
  const afterTotal  = afterSlices.reduce((s, sl) => s + sl.value, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Carbon Budget Comparison</h3>
        <p className="mt-1 text-sm text-slate-500">Before vs after intervention</p>
      </div>

      {/* KPI cards — all parameters shown */}
      {(beforeRows.length > 0 || afterRows.length > 0) && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...beforeRows, ...afterRows].map((row, i) => (
            <div key={`${row.parameter}-${i}`} className={`rounded-2xl border p-4 ${CARD_STYLES[i % CARD_STYLES.length]}`}>
              <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${PILL_COLORS[i % PILL_COLORS.length]}`}>
                {row.parameter.slice(0, 20)}
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">
                {(Math.abs(parseFloat(row.value || '0')) / 1000).toFixed(1)} t
              </div>
              <div className="mt-1 text-sm text-slate-500">CO2e / year</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {/* Before detail */}
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-600">Baseline</div>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            {beforeRows.map((row, i) => (
              <>
                <span key={`lbl-${i}`} className="text-slate-700">{row.parameter}</span>
                <span key={`val-${i}`} className={`font-semibold ${TEXT_COLORS[i % TEXT_COLORS.length]}`}>
                  {(parseFloat(row.value || '0') / 1000).toFixed(2)} t
                </span>
              </>
            ))}
          </div>
        </div>

        {/* After detail */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">After Intervention</div>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            {afterRows.map((row, i) => (
              <>
                <span key={`lbl-${i}`} className="text-slate-700">{row.parameter}</span>
                <span key={`val-${i}`} className={`font-semibold ${TEXT_COLORS[i % TEXT_COLORS.length]}`}>
                  {(parseFloat(row.value || '0') / 1000).toFixed(2)} t
                </span>
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Donut charts */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <DonutChart slices={beforeSlices} title="Baseline (Before)" />
          <div className="space-y-2">
            {beforeSlices.map((sl, i) => (
              <LegendItem key={`${sl.label}-${i}`} label={sl.label} value={sl.value} total={beforeTotal} idx={sl.idx} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <DonutChart slices={afterSlices} title="After Intervention" />
          <div className="space-y-2">
            {afterSlices.map((sl, i) => (
              <LegendItem key={`${sl.label}-${i}`} label={sl.label} value={sl.value} total={afterTotal} idx={sl.idx} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
