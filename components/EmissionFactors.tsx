'use client';

export interface FactorRow {
  category: string;
  emission_factor: string;
  source: string;
  [key: string]: string;
}

const SOURCE_STYLES: Record<string, { pill: string; val: string }> = {
  'IPCC 2006': { pill: 'bg-[#eef3ff] text-[#2040a0] border-[#b8ccf4]', val: 'text-[#2040a0]' },
  'CEA India': { pill: 'bg-[#fff0e8] text-[#b05010] border-[#f4b896]', val: 'text-[#b05010]' },
  'CPCB':      { pill: 'bg-[#f8eeff] text-[#5020a0] border-[#d0a8f4]', val: 'text-[#5020a0]' },
  'EX-ACT':    { pill: 'bg-[#edfaf3] text-[#106030] border-[#96dbb4]', val: 'text-[#106030]' },
};
const FALLBACK_PILLS = [
  'bg-[#eef3ff] text-[#2040a0] border-[#b8ccf4]',
  'bg-[#fff0e8] text-[#b05010] border-[#f4b896]',
  'bg-[#f8eeff] text-[#5020a0] border-[#d0a8f4]',
  'bg-[#edfaf3] text-[#106030] border-[#96dbb4]',
  'bg-[#fffbec] text-[#8a6208] border-[#f5d78a]',
  'bg-[#ecfcfc] text-[#066066] border-[#8cd8d8]',
];

const KNOWN = new Set(['category', 'emission_factor', 'source']);

export default function EmissionFactors({ rows }: { rows: FactorRow[] | null | undefined }) {
  if (!rows?.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-10 text-center text-sm text-[#6b6860]">No emission factors</div>
  );

  const sources = Array.from(new Set(rows.map(r => r.source).filter(Boolean)));
  const srcIdx  = new Map(sources.map((s, i) => [s, i]));
  const extraCols = rows.length > 0 ? Object.keys(rows[0]).filter(k => !KNOWN.has(k)) : [];

  function getStyle(source: string) {
    return SOURCE_STYLES[source] || { pill: FALLBACK_PILLS[(srcIdx.get(source) ?? 0) % FALLBACK_PILLS.length], val: 'text-[#2040a0]' };
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Emission Factors</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">Reference values · {rows.length} entries · extra columns auto-rendered</p>
        </div>
        {/* source legend — auto-built from unique sources */}
        <div className="flex flex-wrap gap-1.5">
          {sources.map(s => {
            const st = getStyle(s);
            return (
              <span key={s} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.pill}`}>{s}</span>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-[#f4f2ee]">
        {rows.map((row, i) => {
          const st = getStyle(row.source);
          const abbrev = row.category?.match(/\b\w/g)?.join('').toUpperCase().slice(0, 3) || row.category?.slice(0, 3).toUpperCase() || '—';
          return (
            <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f8f7f4]">
              <span className={`inline-flex min-w-10 justify-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${st.pill}`}>
                {abbrev}
              </span>
              <span className="min-w-[130px] flex-1 text-sm font-bold text-[#1a1a1a]">{row.category}</span>
              <span className={`text-sm font-black ${st.val}`}>{row.emission_factor}</span>
              {extraCols.map(col => (
                <span key={col} className="text-xs text-[#6b6860]">{row[col]}</span>
              ))}
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.pill}`}>{row.source}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
