'use client';

import { useEffect, useMemo, useState } from 'react';

export interface EmissionRow {
  vlcode: string;
  village_name: string;
  sector: string;
  activity: string;
  annual_co2_kg: string;
}

type SortMode = 'value' | 'sector' | 'alpha';
type Tone = 'orange' | 'amber' | 'blue' | 'emerald' | 'violet' | 'pink' | 'slate';

const WIDTH_CLASSES = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-1/2',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
] as const;

const SECTOR_TONES: Record<string, Tone> = {
  Residential: 'orange',
  Energy: 'amber',
  Transport: 'blue',
  Agriculture: 'emerald',
  Waste: 'violet',
  Livestock: 'pink',
};

const TONE_CLASSES: Record<
  Tone,
  { pill: string; text: string; bar: string; track: string; subtle: string; ring: string }
> = {
  orange: {
    pill: 'bg-orange-100 text-orange-700',
    text: 'text-orange-600',
    bar: 'bg-orange-500',
    track: 'bg-orange-100',
    subtle: 'bg-orange-50 border-orange-200',
    ring: 'ring-orange-200',
  },
  amber: {
    pill: 'bg-amber-100 text-amber-700',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
    track: 'bg-amber-100',
    subtle: 'bg-amber-50 border-amber-200',
    ring: 'ring-amber-200',
  },
  blue: {
    pill: 'bg-blue-100 text-blue-700',
    text: 'text-blue-600',
    bar: 'bg-blue-500',
    track: 'bg-blue-100',
    subtle: 'bg-blue-50 border-blue-200',
    ring: 'ring-blue-200',
  },
  emerald: {
    pill: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-600',
    bar: 'bg-emerald-500',
    track: 'bg-emerald-100',
    subtle: 'bg-emerald-50 border-emerald-200',
    ring: 'ring-emerald-200',
  },
  violet: {
    pill: 'bg-violet-100 text-violet-700',
    text: 'text-violet-600',
    bar: 'bg-violet-500',
    track: 'bg-violet-100',
    subtle: 'bg-violet-50 border-violet-200',
    ring: 'ring-violet-200',
  },
  pink: {
    pill: 'bg-pink-100 text-pink-700',
    text: 'text-pink-600',
    bar: 'bg-pink-500',
    track: 'bg-pink-100',
    subtle: 'bg-pink-50 border-pink-200',
    ring: 'ring-pink-200',
  },
  slate: {
    pill: 'bg-slate-100 text-slate-700',
    text: 'text-slate-600',
    bar: 'bg-slate-500',
    track: 'bg-slate-100',
    subtle: 'bg-slate-50 border-slate-200',
    ring: 'ring-slate-200',
  },
};

function getWidthClass(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  return WIDTH_CLASSES[Math.round(clamped / 5)];
}

function shortLabel(text: string, limit = 28): string {
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export default function EmissionsChart({ rows }: { rows: EmissionRow[] | null | undefined }) {
  const [sortMode, setSortMode] = useState<SortMode>('value');
  const [topN, setTopN] = useState(6);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const aggregated = useMemo(() => {
    const activityMap = new Map<string, { value: number; sector: string }>();

    (rows || []).forEach((row) => {
      const value = parseFloat(row.annual_co2_kg || '0') || 0;
      if (value <= 0) return;

      const previous = activityMap.get(row.activity);
      activityMap.set(row.activity, {
        value: (previous?.value || 0) + value,
        sector: row.sector,
      });
    });

    return Array.from(activityMap.entries()).map(([label, data]) => ({
      key: label,
      label,
      sector: data.sector,
      value: data.value,
    }));
  }, [rows]);

  if (aggregated.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        No emissions data available
      </div>
    );
  }

  const sectorTotals = Array.from(
    aggregated.reduce((map, item) => {
      map.set(item.sector, (map.get(item.sector) || 0) + item.value);
      return map;
    }, new Map<string, number>())
  )
    .map(([sector, value]) => ({ sector, value }))
    .sort((a, b) => b.value - a.value);

  const total = sectorTotals.reduce((sum, item) => sum + item.value, 0);

  const sorted = [...aggregated].sort((a, b) => {
    if (sortMode === 'value') return b.value - a.value;
    if (sortMode === 'sector') return a.sector.localeCompare(b.sector) || b.value - a.value;
    return a.label.localeCompare(b.label);
  });

  const filtered = activeSector ? sorted.filter((item) => item.sector === activeSector) : sorted;
  const visibleItems = filtered.slice(0, topN);
  const maxValue = Math.max(...visibleItems.map((item) => item.value), 1);
  const selected =
    visibleItems.find((item) => item.key === selectedActivity) || visibleItems[0] || filtered[0];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Annual Emissions</h3>
          <p className="mt-1 text-sm text-slate-500">CO2e by activity from API data</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">
            Total / Year
          </div>
          <div className="mt-1 text-2xl font-bold text-red-700">
            {(total / 1000).toFixed(1)} t
          </div>
          <div className="text-xs text-red-500">CO2e</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['value', 'sector', 'alpha'] as SortMode[]).map((mode) => {
            const isActive = sortMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode === 'value' ? 'By Value' : mode === 'sector' ? 'By Sector' : 'A-Z'}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {[6, 10, filtered.length].map((count, index) => {
            const label = index === 2 ? 'All' : `Top ${count}`;
            const isActive = topN === count;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setTopN(count)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveSector(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !activeSector
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          All sectors
        </button>
        {sectorTotals.map((sector) => {
          const tone = TONE_CLASSES[SECTOR_TONES[sector.sector] || 'slate'];
          const isActive = activeSector === sector.sector;

          return (
            <button
              key={sector.sector}
              type="button"
              onClick={() => setActiveSector(isActive ? null : sector.sector)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? tone.subtle
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sector.sector} {((sector.value / total) * 100).toFixed(0)}%
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const tone = TONE_CLASSES[SECTOR_TONES[item.sector] || 'slate'];
            const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const sharePercent = total > 0 ? (item.value / total) * 100 : 0;
            const isActive = selected.key === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedActivity(item.key)}
                className={`w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                  isActive ? `ring-2 ring-offset-1 ${tone.ring}` : ''
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-flex min-w-16 justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.pill}`}
                    >
                      {item.sector}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {shortLabel(item.label, isNarrow ? 24 : 36)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {(item.value / 1000).toFixed(2)} t CO2e
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${tone.text}`}>
                      {sharePercent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">share of total</div>
                  </div>
                </div>
                <div className={`mt-3 h-2 rounded-full ${tone.track}`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${tone.bar} ${getWidthClass(
                      Math.max(widthPercent, 5)
                    )}`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Selected Activity
            </div>
            <div className="mt-3 text-xl font-bold text-slate-900">{selected.label}</div>
            <div
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                TONE_CLASSES[SECTOR_TONES[selected.sector] || 'slate'].pill
              }`}
            >
              {selected.sector}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Emission
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {(selected.value / 1000).toFixed(3)} t
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Share
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {((selected.value / total) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Visible Rank
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  #{visibleItems.findIndex((item) => item.key === selected.key) + 1}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Sector Share
            </div>
            <div className="mt-4 space-y-3">
              {sectorTotals.map((sector) => {
                const tone = TONE_CLASSES[SECTOR_TONES[sector.sector] || 'slate'];
                const share = total > 0 ? (sector.value / total) * 100 : 0;
                return (
                  <button
                    key={sector.sector}
                    type="button"
                    onClick={() =>
                      setActiveSector((prev) => (prev === sector.sector ? null : sector.sector))
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      activeSector === sector.sector
                        ? tone.subtle
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">{sector.sector}</div>
                      <div className={`text-sm font-bold ${tone.text}`}>{share.toFixed(1)}%</div>
                    </div>
                    <div className={`mt-2 h-2 rounded-full ${tone.track}`}>
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${tone.bar} ${getWidthClass(
                          Math.max(share, 5)
                        )}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
