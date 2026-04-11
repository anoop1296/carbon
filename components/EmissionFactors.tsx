'use client';

export interface FactorRow {
  category: string;
  emission_factor: string;
  source: string;
}

type Tone = 'blue' | 'orange' | 'violet' | 'emerald' | 'slate';

const ICONS: Record<string, string> = {
  LPG: 'LPG',
  Firewood: 'FW',
  Electricity: 'ELC',
  'Petrol/Diesel': 'PTR',
  Waste: 'WST',
  Rice: 'RCE',
  Wheat: 'WHT',
};

const SOURCE_TONES: Record<string, Tone> = {
  'IPCC 2006': 'blue',
  'CEA India': 'orange',
  CPCB: 'violet',
  'EX-ACT': 'emerald',
};

const TONE_CLASSES: Record<Tone, { badge: string; chip: string; value: string }> = {
  blue: {
    badge: 'bg-blue-100 text-blue-700',
    chip: 'bg-blue-100 text-blue-700',
    value: 'text-blue-700',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-700',
    chip: 'bg-orange-100 text-orange-700',
    value: 'text-orange-700',
  },
  violet: {
    badge: 'bg-violet-100 text-violet-700',
    chip: 'bg-violet-100 text-violet-700',
    value: 'text-violet-700',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-700',
    value: 'text-emerald-700',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700',
    chip: 'bg-slate-100 text-slate-700',
    value: 'text-slate-700',
  },
};

export default function EmissionFactors({ rows }: { rows: FactorRow[] | null | undefined }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        No emission factors
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">Emission Factors</h3>
        <p className="mt-1 text-sm text-slate-500">Reference values used in calculations</p>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => {
          const tone = TONE_CLASSES[SOURCE_TONES[row.source] || 'slate'];
          return (
            <div
              key={`${row.category}-${index}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
            >
              <span
                className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.badge}`}
              >
                {ICONS[row.category] || row.category.slice(0, 3).toUpperCase()}
              </span>
              <span className="min-w-[140px] flex-1 text-sm font-semibold text-slate-900">
                {row.category}
              </span>
              <span className={`text-sm font-bold ${tone.value}`}>{row.emission_factor}</span>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${tone.chip}`}
              >
                {row.source}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
