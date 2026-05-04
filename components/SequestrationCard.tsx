'use client';

export interface SeqBeforeRow {
  vlcode: string;
  village_name: string;
  source: string;
  area_ha: string;
  annual_co2_sequestered_kg: string;
}

export interface SeqAfterRow {
  vlcode: string;
  village_name: string;
  type: string;
  intervention: string;
  area_added_ha: string;
  sequestration_factor: string;
  annual_co2_sequestration_kg: string;
}

const WIDTH_CLASSES = [
  'w-0', 'w-[5%]', 'w-[10%]', 'w-[15%]', 'w-[20%]', 'w-[25%]',
  'w-[30%]', 'w-[35%]', 'w-[40%]', 'w-[45%]', 'w-1/2',
  'w-[55%]', 'w-[60%]', 'w-[65%]', 'w-[70%]', 'w-[75%]',
  'w-[80%]', 'w-[85%]', 'w-[90%]', 'w-[95%]', 'w-full',
] as const;

const PALETTE = [
  { card: 'bg-emerald-50 border-emerald-200', pill: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600', track: 'bg-emerald-100', fill: 'bg-emerald-500' },
  { card: 'bg-amber-50 border-amber-200',     pill: 'bg-amber-100 text-amber-700',     text: 'text-amber-600',  track: 'bg-amber-100',  fill: 'bg-amber-500'  },
  { card: 'bg-blue-50 border-blue-200',       pill: 'bg-blue-100 text-blue-700',       text: 'text-blue-600',   track: 'bg-blue-100',   fill: 'bg-blue-500'   },
  { card: 'bg-cyan-50 border-cyan-200',       pill: 'bg-cyan-100 text-cyan-700',       text: 'text-cyan-600',   track: 'bg-cyan-100',   fill: 'bg-cyan-500'   },
  { card: 'bg-violet-50 border-violet-200',   pill: 'bg-violet-100 text-violet-700',   text: 'text-violet-600', track: 'bg-violet-100', fill: 'bg-violet-500' },
  { card: 'bg-teal-50 border-teal-200',       pill: 'bg-teal-100 text-teal-700',       text: 'text-teal-600',   track: 'bg-teal-100',   fill: 'bg-teal-500'   },
  { card: 'bg-pink-50 border-pink-200',       pill: 'bg-pink-100 text-pink-700',       text: 'text-pink-600',   track: 'bg-pink-100',   fill: 'bg-pink-500'   },
  { card: 'bg-indigo-50 border-indigo-200',   pill: 'bg-indigo-100 text-indigo-700',   text: 'text-indigo-600', track: 'bg-indigo-100', fill: 'bg-indigo-500' },
  { card: 'bg-slate-50 border-slate-200',     pill: 'bg-slate-100 text-slate-700',     text: 'text-slate-600',  track: 'bg-slate-100',  fill: 'bg-slate-500'  },
];

function getWidthClass(percent: number): string {
  return WIDTH_CLASSES[Math.round(Math.max(0, Math.min(100, percent)) / 5)];
}

function badgeText(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 3) || 'GEN';
}

export function SequestrationCard({
  before,
  after,
}: {
  before: SeqBeforeRow[] | null | undefined;
  after: SeqAfterRow[] | null | undefined;
}) {
  const beforeRows = before || [];
  const afterRows  = (after || []).filter((row) => row.type || row.intervention);

  // Stable color index per type
  const typeColorIdx = new Map<string, number>();
  afterRows.forEach((row) => {
    if (!typeColorIdx.has(row.type)) typeColorIdx.set(row.type, typeColorIdx.size);
  });

  const existingTotalKg = beforeRows.reduce(
    (sum, row) => sum + (parseFloat(row.annual_co2_sequestered_kg || '0') || 0),
    0
  );
  const addedTotalKg = afterRows.reduce(
    (sum, row) => sum + (parseFloat(row.annual_co2_sequestration_kg || '0') || 0),
    0
  );
  const addedArea = afterRows.reduce(
    (sum, row) => sum + (parseFloat(row.area_added_ha || '0') || 0),
    0
  );
  const topAdded = Math.max(
    ...afterRows.map((row) => parseFloat(row.annual_co2_sequestration_kg || '0') || 0),
    1
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="border-b border-slate-100 pb-5">
        <h3 className="text-xl font-bold text-slate-900">Sequestration</h3>
        <p className="mt-1 text-sm text-slate-500">Existing sink vs added interventions</p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* BEFORE */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-2 border-b border-amber-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Existing Sequestration</div>
              <div className="mt-1 text-sm text-amber-700/80">Current village sink sources</div>
            </div>
            <div className="text-3xl font-bold text-amber-700">{(existingTotalKg / 1000).toFixed(1)} t</div>
          </div>

          <div className="mt-4 space-y-3">
            {beforeRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-white/70 p-6 text-center text-sm text-slate-500">
                No existing sequestration data available
              </div>
            ) : (
              beforeRows.map((row, index) => {
                const value   = parseFloat(row.annual_co2_sequestered_kg || '0') || 0;
                const percent = existingTotalKg > 0 ? (value / existingTotalKg) * 100 : 0;
                return (
                  <div key={`${row.source}-${index}`} className="rounded-xl border border-amber-200 bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">{row.source || 'Unknown'}</div>
                      <div className="text-sm font-bold text-amber-700">{(value / 1000).toFixed(2)} t</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{Number(row.area_ha || 0).toFixed(1)} ha</span>
                      <span>{percent.toFixed(1)}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-amber-100">
                      <div className={`h-2 rounded-full bg-amber-500 ${getWidthClass(Math.max(percent, 5))}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AFTER */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col gap-2 border-b border-emerald-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Added Interventions</div>
              <div className="mt-1 text-sm text-emerald-700/80">Area added: {addedArea.toFixed(1)} ha</div>
            </div>
            <div className="text-3xl font-bold text-emerald-700">{(addedTotalKg / 1000).toFixed(1)} t</div>
          </div>

          <div className="mt-4 space-y-3">
            {afterRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 p-6 text-center text-sm text-slate-500">
                No intervention sequestration data available
              </div>
            ) : (
              afterRows.map((row, index) => {
                const value   = parseFloat(row.annual_co2_sequestration_kg || '0') || 0;
                const percent = addedTotalKg > 0 ? (value / addedTotalKg) * 100 : 0;
                const relative = topAdded > 0 ? (value / topAdded) * 100 : 0;
                const tone    = PALETTE[(typeColorIdx.get(row.type) ?? index) % PALETTE.length];
                return (
                  <div key={`${row.intervention}-${index}`} className={`rounded-xl border p-4 ${tone.card}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.pill}`}>
                          {badgeText(row.type || row.intervention)}
                        </div>
                        <div className="mt-2 truncate text-sm font-semibold text-slate-900">{row.intervention}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${tone.text}`}>{(value / 1000).toFixed(2)} t</div>
                        <div className="text-xs text-slate-500">{percent.toFixed(1)}% of added total</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div>{Number(row.area_added_ha || 0).toFixed(1)} ha added</div>
                      <div className="text-right">{Number(row.sequestration_factor || 0).toFixed(0)} kg/ha/yr</div>
                    </div>
                    <div className={`mt-3 h-2 rounded-full ${tone.track}`}>
                      <div className={`h-2 rounded-full ${tone.fill} ${getWidthClass(Math.max(relative, 5))}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SequestrationCard;
export type { FactorRow } from './EmissionFactors';
export { default as EmissionFactors } from './EmissionFactors';
