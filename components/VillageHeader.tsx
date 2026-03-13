'use client';

export interface VillageRow {
  vlcode: string;
  village_name: string;
  district: string;
  state: string;
  total_population: string;
  total_area_ha: string;
  builtup_area_ha: string;
  agricultural_area_ha: string;
  water_bodies_area_ha: string;
  total_households: string;
  total_livestock: string;
  total_vehicles: string;
}

type StatCard = {
  label: string;
  value: number;
  suffix?: string;
  note: string;
  accent: string;
  bg: string;
};

function toNum(v: string | null | undefined): number {
  const n = parseFloat(v || '0');
  return Number.isFinite(n) ? n : 0;
}

function formatVal(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

function StatTile({ stat }: { stat: StatCard }) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderTop: `3px solid ${stat.accent}` }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{stat.label}</div>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-xl font-bold text-gray-900 leading-none">{formatVal(stat.value)}</span>
        {stat.suffix && <span className="text-xs font-medium text-gray-600">{stat.suffix}</span>}
      </div>
      <div className="mt-1 text-[11px] text-gray-500">{stat.note}</div>
      <div className="mt-2 h-1.5 rounded-full" style={{ background: stat.bg }}>
        <div className="h-1.5 w-7 rounded-full" style={{ background: stat.accent }} />
      </div>
    </div>
  );
}

export default function VillageHeader({ v }: { v: VillageRow | null | undefined }) {
  if (!v) return null;

  const stats: StatCard[] = [
    {
      label: 'Population',
      value: toNum(v.total_population),
      note: 'Residents',
      accent: '#ef4444',
      bg: '#fee2e2',
    },
    {
      label: 'Total Area',
      value: toNum(v.total_area_ha),
      suffix: 'ha',
      note: 'Village extent',
      accent: '#3b82f6',
      bg: '#dbeafe',
    },
    {
      label: 'Agriculture',
      value: toNum(v.agricultural_area_ha),
      suffix: 'ha',
      note: 'Cultivated area',
      accent: '#10b981',
      bg: '#d1fae5',
    },
    {
      label: 'Water Bodies',
      value: toNum(v.water_bodies_area_ha),
      suffix: 'ha',
      note: 'Water coverage',
      accent: '#06b6d4',
      bg: '#cffafe',
    },
    {
      label: 'Households',
      value: toNum(v.total_households),
      note: 'Total homes',
      accent: '#8b5cf6',
      bg: '#ede9fe',
    },
    {
      label: 'Livestock',
      value: toNum(v.total_livestock),
      note: 'Animal count',
      accent: '#f59e0b',
      bg: '#fef3c7',
    },
  ];

  return (
    <section className="mb-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-[150px] sm:min-w-[170px] flex-1">
            <StatTile stat={stat} />
          </div>
        ))}
      </div>
    </section>
  );
}
