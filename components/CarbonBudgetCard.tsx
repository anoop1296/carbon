'use client';

import { useMemo, useState } from 'react';

export interface BudgetRow {
  vlcode: string;
  village_name: string;
  parameter: string;
  value: string;
  unit?: string;
}

type Tone = 'red' | 'green' | 'blue' | 'violet' | 'slate';

type Slice = {
  label: string;
  value: number;
  color: string;
  tone: Tone;
};

const TONE_CLASSES: Record<Tone, { card: string; pill: string; text: string; dot: string }> = {
  red: { card: 'bg-red-50 border-red-200', pill: 'bg-red-100 text-red-700', text: 'text-red-600', dot: 'bg-red-500' },
  green: { card: 'bg-emerald-50 border-emerald-200', pill: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  blue: { card: 'bg-blue-50 border-blue-200', pill: 'bg-blue-100 text-blue-700', text: 'text-blue-600', dot: 'bg-blue-500' },
  violet: { card: 'bg-violet-50 border-violet-200', pill: 'bg-violet-100 text-violet-700', text: 'text-violet-600', dot: 'bg-violet-500' },
  slate: { card: 'bg-slate-50 border-slate-200', pill: 'bg-slate-100 text-slate-700', text: 'text-slate-600', dot: 'bg-slate-400' },
};

function getVal(rows: BudgetRow[] | null | undefined = [], param: string): number {
  return (
    parseFloat(rows?.find((row) => row.parameter?.toLowerCase().includes(param.toLowerCase()))?.value || '0') ||
    0
  );
}

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const os = polarXY(cx, cy, outerR, startDeg);
  const oe = polarXY(cx, cy, outerR, endDeg);
  const innerStart = polarXY(cx, cy, innerR, endDeg);
  const innerEnd = polarXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({ slices, title }: { slices: Slice[]; title: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 14;
  const innerR = outerR * 0.62;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const active = hovered !== null ? slices[hovered] : null;

  let angle = 0;
  const built = slices.map((slice) => {
    const span = total > 0 ? (slice.value / total) * 360 : 0;
    const start = angle;
    const end = angle + span;
    angle += span;
    return { slice, start, end };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-center text-sm font-semibold text-slate-700">{title}</div>
      <svg
        width="220"
        height="220"
        viewBox="0 0 220 220"
        className="mx-auto mt-3 overflow-visible"
        role="img"
        aria-label={title}
      >
        {built.map(({ slice, start, end }, index) => {
          if (end <= start) return null;
          const isDimmed = hovered !== null && hovered !== index;

          return (
            <path
              key={`${slice.label}-${index}`}
              d={donutPath(cx, cy, outerR, innerR, start, end)}
              fill={slice.color}
              opacity={isDimmed ? 0.35 : 1}
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
          {active ? active.label : 'Total'}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-slate-900 text-[26px] font-bold">
          {((active?.value || total) / 1000).toFixed(1)}
        </text>
        <text x={cx} y={cy + 28} textAnchor="middle" className="fill-slate-500 text-[11px]">
          t CO2e
        </text>
      </svg>
    </div>
  );
}

function LegendItem({ slice, percent, tons }: { slice: Slice; percent: number; tons: number }) {
  const tone = TONE_CLASSES[slice.tone];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className={`h-3 w-3 rounded-md ${tone.dot}`} />
      <span className="flex-1 text-sm font-semibold text-slate-900">{slice.label}</span>
      <span className={`text-xs font-bold ${tone.text}`}>{percent.toFixed(1)}%</span>
      <span className="text-xs font-semibold text-slate-500">{tons.toFixed(1)} t</span>
    </div>
  );
}

function BudgetKPICard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  const styles = TONE_CLASSES[tone];

  return (
    <div className={`rounded-2xl border p-4 ${styles.card}`}>
      <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${styles.pill}`}>
        {label}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{sub}</div>
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
  const totalEm = getVal(before, 'total emission');
  const totalSeq = getVal(before, 'total sequestration');
  const netEm = getVal(before, 'net emission');
  const coverage = totalEm > 0 ? (totalSeq / totalEm) * 100 : 0;

  const prevNet = getVal(after, 'previous net') || netEm;
  const newNet = getVal(after, 'new net');
  const emRed = getVal(after, 'emission reduction');
  const seqInc = getVal(after, 'sequestration increase');
  const pctRed = prevNet > 0 ? ((prevNet - newNet) / prevNet) * 100 : 0;

  const beforeSlices = useMemo<Slice[]>(() => {
    const slices: Slice[] = [];
    const remainder = Math.max(totalEm - totalSeq - netEm, 0);

    if (totalSeq > 0) {
      slices.push({ label: 'Sequestered', value: totalSeq, color: '#10b981', tone: 'green' });
    }
    if (netEm > 0) {
      slices.push({ label: 'Net Emission', value: netEm, color: '#ef4444', tone: 'red' });
    }
    if (remainder > 0) {
      slices.push({ label: 'Gross Remaining', value: remainder, color: '#8b5cf6', tone: 'violet' });
    }

    return slices.length > 0 ? slices : [{ label: 'No Data', value: 1, color: '#94a3b8', tone: 'slate' }];
  }, [netEm, totalEm, totalSeq]);

  const afterSlices = useMemo<Slice[]>(() => {
    const slices: Slice[] = [];

    if (emRed > 0) {
      slices.push({ label: 'Reduced', value: emRed, color: '#3b82f6', tone: 'blue' });
    }
    if (seqInc > 0) {
      slices.push({ label: 'Seq. Increase', value: seqInc, color: '#10b981', tone: 'green' });
    }
    if (newNet > 0) {
      slices.push({ label: 'New Net Emission', value: newNet, color: '#ef4444', tone: 'red' });
    }

    return slices.length > 0
      ? slices
      : [{ label: 'No Change', value: 1, color: '#94a3b8', tone: 'slate' }];
  }, [emRed, newNet, seqInc]);

  const beforeTotal = beforeSlices.reduce((sum, slice) => sum + slice.value, 0);
  const afterTotal = afterSlices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Carbon Budget Comparison</h3>
        <p className="mt-1 text-sm text-slate-500">Before vs after intervention</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BudgetKPICard
          label="Total Emissions"
          value={totalEm > 0 ? `${(totalEm / 1000).toFixed(1)} t` : '--'}
          sub="CO2e / year"
          tone="red"
        />
        <BudgetKPICard
          label="Net After Reduction"
          value={newNet > 0 ? `${(newNet / 1000).toFixed(1)} t` : '--'}
          sub="CO2e / year"
          tone="green"
        />
        <BudgetKPICard
          label="Reduction Achieved"
          value={pctRed > 0 ? `${pctRed.toFixed(1)}%` : '--'}
          sub="via interventions"
          tone="violet"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-600">
              Baseline
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <span className="text-slate-700">Total Emission</span>
              <span className="font-semibold text-red-600">{(totalEm / 1000).toFixed(1)} t</span>
              <span className="text-slate-700">Sequestered</span>
              <span className="font-semibold text-emerald-600">{(totalSeq / 1000).toFixed(1)} t</span>
              <span className="text-slate-700">Net Emission</span>
              <span className="font-semibold text-red-600">{(netEm / 1000).toFixed(1)} t</span>
              <span className="text-slate-700">Coverage</span>
              <span className="font-semibold text-slate-900">{coverage.toFixed(0)}%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
              After Intervention
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <span className="text-slate-700">Previous Net</span>
              <span className="font-semibold text-red-600">{(prevNet / 1000).toFixed(1)} t</span>
              <span className="text-slate-700">New Net</span>
              <span className="font-semibold text-red-600">{(newNet / 1000).toFixed(1)} t</span>
              <span className="text-slate-700">Emission Reduced</span>
              <span className="font-semibold text-blue-600">{(emRed / 1000).toFixed(1)} t</span>
              <span className="text-slate-700">Seq. Increase</span>
              <span className="font-semibold text-emerald-600">{(seqInc / 1000).toFixed(1)} t</span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <DonutChart slices={beforeSlices} title="Baseline (Before)" />
            <div className="space-y-2">
              {beforeSlices.map((slice, index) => (
                <LegendItem
                  key={`${slice.label}-${index}`}
                  slice={slice}
                  percent={(slice.value / beforeTotal) * 100}
                  tons={slice.value / 1000}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <DonutChart slices={afterSlices} title="After Intervention" />
            <div className="space-y-2">
              {afterSlices.map((slice, index) => (
                <LegendItem
                  key={`${slice.label}-${index}`}
                  slice={slice}
                  percent={(slice.value / afterTotal) * 100}
                  tons={slice.value / 1000}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
