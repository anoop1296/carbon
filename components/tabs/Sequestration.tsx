'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, string>;

const AFTER_COLORS = [
  { bg: '#edfaf3', border: '#96dbb4', bar: '#1a8a50', text: '#106030', pill: 'bg-[#d4f4e4] text-[#106030] border-[#96dbb4]' },
  { bg: '#fffbec', border: '#f5d78a', bar: '#c8920a', text: '#8a6208', pill: 'bg-[#fef8e0] text-[#8a6208] border-[#f5d78a]' },
  { bg: '#eef3ff', border: '#b8ccf4', bar: '#3460c8', text: '#2040a0', pill: 'bg-[#dce8ff] text-[#2040a0] border-[#b8ccf4]' },
  { bg: '#ecfcfc', border: '#8cd8d8', bar: '#0a8a90', text: '#066066', pill: 'bg-[#d0f8f8] text-[#066066] border-[#8cd8d8]' },
  { bg: '#f8eeff', border: '#d0a8f4', bar: '#7830c8', text: '#5020a0', pill: 'bg-[#eedcff] text-[#5020a0] border-[#d0a8f4]' },
  { bg: '#fef4ec', border: '#f0c090', bar: '#d06010', text: '#904008', pill: 'bg-[#fde8d0] text-[#904008] border-[#f0c090]' },
];

const IDENTITY = new Set(['vlcode', 'village_name']);

function toLabel(k: string) { return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function initials(s: string) { return s.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3) || 'SEQ'; }
// Heuristic: pick the numeric field most likely to represent CO2 value
function co2Field(row: Row): string {
  const keys = Object.keys(row).filter(k => !IDENTITY.has(k));
  const co2   = keys.find(k => /co2|seq|carbon/i.test(k) && /kg/i.test(k));
  const kg    = keys.find(k => /kg/i.test(k));
  return co2 || kg || keys[keys.length - 1] || '';
}

function areaField(row: Row): string {
  const keys = Object.keys(row).filter(k => !IDENTITY.has(k));
  return keys.find(k => /area|ha/i.test(k)) || '';
}

// Pick the "name/label" field for a before row (source of sequestration)
function labelField(row: Row): string {
  const keys = Object.keys(row).filter(k => !IDENTITY.has(k));
  const src  = keys.find(k => /source|name|type|label/i.test(k));
  return src || keys[0] || '';
}

function SequestrationChart({ before, after }: { before: Row[]; after: Row[] }) {
  const bRows = before;
  const aRows = after;

  // Determine display fields dynamically per row
  const bCo2Field   = bRows[0] ? co2Field(bRows[0])   : '';
  const bAreaField  = bRows[0] ? areaField(bRows[0])  : '';
  const bLabelField = bRows[0] ? labelField(bRows[0]) : '';
  const aCo2Field   = aRows[0] ? co2Field(aRows[0])   : '';
  const aAreaField  = aRows[0] ? areaField(aRows[0])  : '';

  // For "after" label: pick first non-identity non-co2 non-area field as name
  function afterLabel(row: Row): string {
    const keys = Object.keys(row).filter(k => !IDENTITY.has(k) && k !== aCo2Field && k !== aAreaField);
    return row[keys[0]] || row[aCo2Field] || '';
  }

  const bTotal = bRows.reduce((s, r) => s + (parseFloat(r[bCo2Field] || '0') || 0), 0);
  const aTotal = aRows.reduce((s, r) => s + (parseFloat(r[aCo2Field] || '0') || 0), 0);
  const bMax   = Math.max(...bRows.map(r => parseFloat(r[bCo2Field] || '0') || 0), 1);
  const aMax   = Math.max(...aRows.map(r => parseFloat(r[aCo2Field] || '0') || 0), 1);

  // Extra fields beyond the main ones
  function bExtras(row: Row) {
    const main = new Set([bCo2Field, bAreaField, bLabelField]);
    return Object.entries(row).filter(([k, v]) => !IDENTITY.has(k) && !main.has(k) && v?.trim());
  }
  function aExtras(row: Row) {
    const main = new Set([aCo2Field, aAreaField]);
    return Object.entries(row).filter(([k, v]) => !IDENTITY.has(k) && !main.has(k) && v?.trim());
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Carbon Sequestration</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">Natural sinks + intervention planting · fields auto-detected</p>
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
        {/* BEFORE panel */}
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
                  const v   = parseFloat(r[bCo2Field] || '0') || 0;
                  const sh  = bTotal > 0 ? (v / bTotal) * 100 : 0;
                  const rel = (v / bMax) * 100;
                  const lbl = r[bLabelField] || `Row ${i + 1}`;
                  const area = r[bAreaField];
                  return (
                    <div key={i} className="rounded-lg border border-white bg-white px-3 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-[#1a1a1a]">{lbl}</p>
                          {area && <p className="text-[10px] text-[#6b6860]">{Number(area).toFixed(1)} ha</p>}
                          {bExtras(r).map(([k, v]) => (
                            <span key={k} className="mr-2 text-[9px] text-[#6b6860]">{toLabel(k)}: {v}</span>
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

        {/* AFTER panel */}
        <div className="overflow-hidden rounded-xl border border-[#96dbb4] bg-[#edfaf3]">
          <div className="flex items-center justify-between border-b border-[#96dbb4]/60 px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#106030]">Added Interventions</p>
            </div>
            <p className="text-xl font-black text-[#1a8a50]">{(aTotal / 1000).toFixed(1)} t</p>
          </div>
          <div className="space-y-2 p-3">
            {aRows.length === 0
              ? <p className="py-6 text-center text-xs text-[#6b6860]">No data</p>
              : aRows.map((r, i) => {
                  const v   = parseFloat(r[aCo2Field] || '0') || 0;
                  const sh  = aTotal > 0 ? (v / aTotal) * 100 : 0;
                  const rel = (v / aMax) * 100;
                  const c   = AFTER_COLORS[i % AFTER_COLORS.length];
                  const lbl = afterLabel(r) || `Row ${i + 1}`;
                  return (
                    <div key={i} className="rounded-lg border bg-white px-3 py-3" style={{ borderColor: c.border }}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${c.pill}`}>
                          {initials(lbl)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#1a1a1a]">{lbl}</p>
                          <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-[#6b6860]">
                            {aExtras(r).map(([k, v]) => (
                              <span key={k}>{toLabel(k)}: {v}</span>
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

function Spinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d8f3dc] border-t-[#2d6a4f]" />
    </div>
  );
}

export default function Sequestration({ vlcode }: { vlcode: string }) {
  const [before, setBefore]   = useState<Row[] | null>(null);
  const [after, setAfter]     = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vlcode) return;
    setLoading(true);
    fetch(`/api/sequestration?vlcode=${vlcode}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setBefore(d.before || []); setAfter(d.after || []); })
      .finally(() => setLoading(false));
  }, [vlcode]);

  if (loading) return <Spinner />;
  return <SequestrationChart before={before || []} after={after || []} />;
}
