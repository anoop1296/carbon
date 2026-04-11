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
  tone:
    | 'red'
    | 'blue'
    | 'emerald'
    | 'cyan'
    | 'violet'
    | 'amber';
};

const TONE_CLASSES: Record<
  StatCard['tone'],
  { border: string; pill: string; track: string; fill: string; text: string }
> = {
  red: {
    border: 'border-t-red-500',
    pill: 'bg-red-100 text-red-700',
    track: 'bg-red-100',
    fill: 'bg-red-500',
    text: 'text-red-600',
  },
  blue: {
    border: 'border-t-blue-500',
    pill: 'bg-blue-100 text-blue-700',
    track: 'bg-blue-100',
    fill: 'bg-blue-500',
    text: 'text-blue-600',
  },
  emerald: {
    border: 'border-t-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700',
    track: 'bg-emerald-100',
    fill: 'bg-emerald-500',
    text: 'text-emerald-600',
  },
  cyan: {
    border: 'border-t-cyan-500',
    pill: 'bg-cyan-100 text-cyan-700',
    track: 'bg-cyan-100',
    fill: 'bg-cyan-500',
    text: 'text-cyan-600',
  },
  violet: {
    border: 'border-t-violet-500',
    pill: 'bg-violet-100 text-violet-700',
    track: 'bg-violet-100',
    fill: 'bg-violet-500',
    text: 'text-violet-600',
  },
  amber: {
    border: 'border-t-amber-500',
    pill: 'bg-amber-100 text-amber-700',
    track: 'bg-amber-100',
    fill: 'bg-amber-500',
    text: 'text-amber-600',
  },
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
  const tone = TONE_CLASSES[stat.tone];

  return (
    <div
      className={`rounded-xl border border-gray-200 border-t-[3px] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${tone.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
            {stat.label}
          </div>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-2xl font-bold leading-none text-gray-900">
              {formatVal(stat.value)}
            </span>
            {stat.suffix && (
              <span className={`text-xs font-semibold ${tone.text}`}>{stat.suffix}</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">{stat.note}</div>
        </div>
        <div
          className={`inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.pill}`}
        >
          {stat.label.slice(0, 3)}
        </div>
      </div>
      <div className={`mt-3 h-1.5 rounded-full ${tone.track}`}>
        <div className={`h-1.5 w-8 rounded-full ${tone.fill}`} />
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
      tone: 'red',
    },
    {
      label: 'Total Area',
      value: toNum(v.total_area_ha),
      suffix: 'ha',
      note: 'Village extent',
      tone: 'blue',
    },
    {
      label: 'Agriculture',
      value: toNum(v.agricultural_area_ha),
      suffix: 'ha',
      note: 'Cultivated area',
      tone: 'emerald',
    },
    {
      label: 'Water Bodies',
      value: toNum(v.water_bodies_area_ha),
      suffix: 'ha',
      note: 'Water coverage',
      tone: 'cyan',
    },
    {
      label: 'Households',
      value: toNum(v.total_households),
      note: 'Total homes',
      tone: 'violet',
    },
    {
      label: 'Livestock',
      value: toNum(v.total_livestock),
      note: 'Animal count',
      tone: 'amber',
    },
  ];

  return (
    <section className="mb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => (
          <StatTile key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}
