'use client';

// VillageRow: whatever columns the Village.csv has — fully dynamic
export type VillageRow = Record<string, string>;

const PALETTE = [
  { border: 'border-t-red-500',     pill: 'bg-red-100 text-red-700',       track: 'bg-red-100',     fill: 'bg-red-500',     text: 'text-red-600'     },
  { border: 'border-t-blue-500',    pill: 'bg-blue-100 text-blue-700',     track: 'bg-blue-100',    fill: 'bg-blue-500',    text: 'text-blue-600'    },
  { border: 'border-t-emerald-500', pill: 'bg-emerald-100 text-emerald-700', track: 'bg-emerald-100', fill: 'bg-emerald-500', text: 'text-emerald-600' },
  { border: 'border-t-cyan-500',    pill: 'bg-cyan-100 text-cyan-700',     track: 'bg-cyan-100',    fill: 'bg-cyan-500',    text: 'text-cyan-600'    },
  { border: 'border-t-violet-500',  pill: 'bg-violet-100 text-violet-700', track: 'bg-violet-100',  fill: 'bg-violet-500',  text: 'text-violet-600'  },
  { border: 'border-t-amber-500',   pill: 'bg-amber-100 text-amber-700',   track: 'bg-amber-100',   fill: 'bg-amber-500',   text: 'text-amber-600'   },
  { border: 'border-t-pink-500',    pill: 'bg-pink-100 text-pink-700',     track: 'bg-pink-100',    fill: 'bg-pink-500',    text: 'text-pink-600'    },
  { border: 'border-t-teal-500',    pill: 'bg-teal-100 text-teal-700',     track: 'bg-teal-100',    fill: 'bg-teal-500',    text: 'text-teal-600'    },
  { border: 'border-t-orange-500',  pill: 'bg-orange-100 text-orange-700', track: 'bg-orange-100',  fill: 'bg-orange-500',  text: 'text-orange-600'  },
  { border: 'border-t-indigo-500',  pill: 'bg-indigo-100 text-indigo-700', track: 'bg-indigo-100',  fill: 'bg-indigo-500',  text: 'text-indigo-600'  },
];

function toLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function toSuffix(key: string): string | undefined {
  if (/_ha$/i.test(key))  return 'ha';
  if (/_kg$/i.test(key))  return 'kg';
  if (/_kwh$/i.test(key)) return 'kWh';
  return undefined;
}

function formatVal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function VillageHeader({ v }: { v: VillageRow | null | undefined }) {
  if (!v) return null;

  // Show only numeric columns — skip the first two (pk + name) and any non-numeric value
  const entries = Object.entries(v);
  const stats = entries
    .slice(2) // skip pk col and name col (first two columns)
    .filter(([, val]) => {
      const n = parseFloat(val || '');
      return Number.isFinite(n);
    })
    .map(([key, val], idx) => ({
      label:  toLabel(key),
      suffix: toSuffix(key),
      value:  parseFloat(val || '0'),
      tone:   PALETTE[idx % PALETTE.length],
    }));

  if (stats.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border border-gray-200 border-t-[3px] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stat.tone.border}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">{stat.label}</div>
                <div className="mt-2 flex items-end gap-1.5">
                  <span className="text-2xl font-bold leading-none text-gray-900">{formatVal(stat.value)}</span>
                  {stat.suffix && <span className={`text-xs font-semibold ${stat.tone.text}`}>{stat.suffix}</span>}
                </div>
              </div>
              <div className={`inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${stat.tone.pill}`}>
                {stat.label.slice(0, 3)}
              </div>
            </div>
            <div className={`mt-3 h-1.5 rounded-full ${stat.tone.track}`}>
              <div className={`h-1.5 w-8 rounded-full ${stat.tone.fill}`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
