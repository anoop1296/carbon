'use client';

export interface SeqBeforeRow {
  vlcode: string; village_name: string; source: string;
  area_ha: string; annual_co2_sequestered_kg: string;
  [key: string]: string;
}
export interface SeqAfterRow {
  vlcode: string; village_name: string; type: string; intervention: string;
  area_added_ha: string; sequestration_factor: string;
  annual_co2_sequestration_kg: string;
  [key: string]: string;
}

const AFTER_COLORS = [
  { bg: '#edfaf3', border: '#96dbb4', bar: '#1a8a50', text: '#106030', pill: 'bg-[#d4f4e4] text-[#106030] border-[#96dbb4]' },
  { bg: '#fffbec', border: '#f5d78a', bar: '#c8920a', text: '#8a6208', pill: 'bg-[#fef8e0] text-[#8a6208] border-[#f5d78a]' },
  { bg: '#eef3ff', border: '#b8ccf4', bar: '#3460c8', text: '#2040a0', pill: 'bg-[#dce8ff] text-[#2040a0] border-[#b8ccf4]' },
  { bg: '#ecfcfc', border: '#8cd8d8', bar: '#0a8a90', text: '#066066', pill: 'bg-[#d0f8f8] text-[#066066] border-[#8cd8d8]' },
  { bg: '#f8eeff', border: '#d0a8f4', bar: '#7830c8', text: '#5020a0', pill: 'bg-[#eedcff] text-[#5020a0] border-[#d0a8f4]' },
  { bg: '#fef4ec', border: '#f0c090', bar: '#d06010', text: '#904008', pill: 'bg-[#fde8d0] text-[#904008] border-[#f0c090]' },
];

const KNOWN_BEFORE = new Set(['vlcode','village_name','source','area_ha','annual_co2_sequestered_kg']);
const KNOWN_AFTER  = new Set(['vlcode','village_name','type','intervention','area_added_ha','sequestration_factor','annual_co2_sequestration_kg']);

function initials(s: string) { return s.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3) || 'SEQ'; }

export function SequestrationCard({ before, after }: {
  before: SeqBeforeRow[] | null | undefined; after: SeqAfterRow[] | null | undefined;
}) {
  const bRows = before || [];
  const aRows = (after || []).filter(r => r.type || r.intervention);

  const typeIdx = new Map<string, number>();
  aRows.forEach(r => { if (!typeIdx.has(r.type)) typeIdx.set(r.type, typeIdx.size); });

  const bTotal = bRows.reduce((s, r) => s + (parseFloat(r.annual_co2_sequestered_kg || '0') || 0), 0);
  const aTotal = aRows.reduce((s, r) => s + (parseFloat(r.annual_co2_sequestration_kg || '0') || 0), 0);
  const aArea  = aRows.reduce((s, r) => s + (parseFloat(r.area_added_ha || '0') || 0), 0);
  const bMax   = Math.max(...bRows.map(r => parseFloat(r.annual_co2_sequestered_kg || '0') || 0), 1);
  const aMax   = Math.max(...aRows.map(r => parseFloat(r.annual_co2_sequestration_kg || '0') || 0), 1);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      {/* header */}
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Carbon Sequestration</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">Natural sinks + intervention planting · auto-detected fields</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-[#f5d78a] bg-[#fffbec] px-4 py-2 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a6208]">Existing</p>
            <p className="mt-0.5 text-xl font-black text-[#c8920a]">{(bTotal / 1000).toFixed(1)} t</p>
          </div>
          <div className="rounded-xl border border-[#96dbb4] bg-[#edfaf3] px-4 py-2 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#106030]">Added</p>
            <p className="mt-0.5 text-xl font-black text-[#1a8a50]">{(aTotal / 1000).toFixed(1)} t</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:p-6 xl:grid-cols-2">
        {/* BEFORE */}
        <div className="overflow-hidden rounded-xl border border-[#f5d78a] bg-[#fffbec]">
          <div className="flex items-center justify-between border-b border-[#f5d78a]/60 px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#8a6208]">Existing Sequestration</p>
              <p className="text-[10px] text-[#a07010]">Natural sinks</p>
            </div>
            <p className="text-xl font-black text-[#c8920a]">{(bTotal / 1000).toFixed(1)} t</p>
          </div>
          <div className="space-y-2 p-3">
            {bRows.length === 0
              ? <p className="py-6 text-center text-xs text-[#6b6860]">No data</p>
              : bRows.map((r, i) => {
                  const v = parseFloat(r.annual_co2_sequestered_kg || '0') || 0;
                  const sh = bTotal > 0 ? (v / bTotal) * 100 : 0;
                  const rel = (v / bMax) * 100;
                  const extras = Object.entries(r).filter(([k]) => !KNOWN_BEFORE.has(k) && r[k]?.trim());
                  return (
                    <div key={i} className="rounded-lg border border-white bg-white px-3 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-[#1a1a1a]">{r.source || 'Unknown'}</p>
                          <p className="text-[10px] text-[#6b6860]">{Number(r.area_ha || 0).toFixed(1)} ha</p>
                          {extras.map(([k, v]) => (
                            <span key={k} className="mr-2 text-[9px] text-[#6b6860]">{k.replace(/_/g,' ')}: {v}</span>
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#c8920a]">{(v / 1000).toFixed(2)} t</p>
                          <p className="text-[10px] text-[#6b6860]">{sh.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#f5e8c0]">
                        <div className="h-1.5 rounded-full bg-[#c8920a] transition-all duration-500" style={{ width: `${Math.max(rel, 4)}%` }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* AFTER */}
        <div className="overflow-hidden rounded-xl border border-[#96dbb4] bg-[#edfaf3]">
          <div className="flex items-center justify-between border-b border-[#96dbb4]/60 px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#106030]">Added Interventions</p>
              <p className="text-[10px] text-[#1a8a50]">{aArea.toFixed(1)} ha planted</p>
            </div>
            <p className="text-xl font-black text-[#1a8a50]">{(aTotal / 1000).toFixed(1)} t</p>
          </div>
          <div className="space-y-2 p-3">
            {aRows.length === 0
              ? <p className="py-6 text-center text-xs text-[#6b6860]">No data</p>
              : aRows.map((r, i) => {
                  const v = parseFloat(r.annual_co2_sequestration_kg || '0') || 0;
                  const sh = aTotal > 0 ? (v / aTotal) * 100 : 0;
                  const rel = (v / aMax) * 100;
                  const c = AFTER_COLORS[(typeIdx.get(r.type) ?? i) % AFTER_COLORS.length];
                  const extras = Object.entries(r).filter(([k]) => !KNOWN_AFTER.has(k) && r[k]?.trim());
                  return (
                    <div key={i} className="rounded-lg border bg-white px-3 py-3" style={{ borderColor: c.border }}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${c.pill}`}>
                          {initials(r.type || r.intervention)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-[#1a1a1a] truncate">{r.intervention}</p>
                          <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-[#6b6860]">
                            <span>{Number(r.area_added_ha || 0).toFixed(1)} ha</span>
                            <span>{Number(r.sequestration_factor || 0).toFixed(0)} kg/ha/yr</span>
                            {extras.map(([k, v]) => (
                              <span key={k}>{k.replace(/_/g,' ')}: {v}</span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black" style={{ color: c.text }}>{(v / 1000).toFixed(2)} t</p>
                          <p className="text-[10px] text-[#6b6860]">{sh.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#eceae5]">
                        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(rel, 4)}%`, background: c.bar }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SequestrationCard;
export type { FactorRow } from './EmissionFactors';
export { default as EmissionFactors } from './EmissionFactors';
