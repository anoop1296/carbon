'use client';

import { useEffect, useMemo, useState } from 'react';

type Sort = 'value' | 'sector' | 'alpha';

interface EmissionRow {
  vlcode: string; village_name: string;
  sector: string; activity: string; annual_co2_kg: string;
}

interface FactorRow {
  category: string; emission_factor: string; source: string;
  [key: string]: string;
}

const FACTOR_KNOWN   = new Set(['category', 'emission_factor', 'source']);
const FACTOR_PILLS   = [
  'bg-[#eef3ff] text-[#2040a0] border-[#b8ccf4]',
  'bg-[#fff0e8] text-[#b05010] border-[#f4b896]',
  'bg-[#f8eeff] text-[#5020a0] border-[#d0a8f4]',
  'bg-[#edfaf3] text-[#106030] border-[#96dbb4]',
  'bg-[#fffbec] text-[#8a6208] border-[#f5d78a]',
  'bg-[#ecfcfc] text-[#066066] border-[#8cd8d8]',
];
function titleCase(s: string) { return s.replace(/\b[a-z]/g, c => c.toUpperCase()); }
function factorLabel(k: string) { return titleCase(k.replace(/_/g, ' ')); }

const SECTOR_COLORS = [
  { bg: '#fff0e8', border: '#f4b896', bar: '#e2711d', text: '#b05010' },
  { bg: '#fffbec', border: '#f5d78a', bar: '#c8920a', text: '#8a6208' },
  { bg: '#eef3ff', border: '#b8ccf4', bar: '#3460c8', text: '#2040a0' },
  { bg: '#edfaf3', border: '#96dbb4', bar: '#1a8a50', text: '#106030' },
  { bg: '#f8eeff', border: '#d0a8f4', bar: '#7830c8', text: '#5020a0' },
  { bg: '#ffecf0', border: '#f4a0b0', bar: '#d01840', text: '#a01030' },
  { bg: '#ecfcfc', border: '#8cd8d8', bar: '#0a8a90', text: '#066066' },
  { bg: '#fef4ec', border: '#f0c090', bar: '#d06010', text: '#904008' },
];

function pct(v: number, mx: number) { return mx > 0 ? Math.min(100, (v / mx) * 100) : 0; }
function fmtT(kg: number) { return (kg / 1000).toFixed(2); }
function short(s: string, n = 32) { return s.length > n ? s.slice(0, n) + '…' : s; }

function EmissionsChart({ rows }: { rows: EmissionRow[] | null }) {
  const [sort, setSort]     = useState<Sort>('value');
  const [topN, setTopN]     = useState(6);
  const [sector, setSector] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const sectorIdx = useMemo(() => {
    const m = new Map<string, number>();
    (rows || []).forEach(r => { if (!m.has(r.sector)) m.set(r.sector, m.size); });
    return m;
  }, [rows]);

  const agg = useMemo(() => {
    const m = new Map<string, { v: number; sector: string }>();
    (rows || []).forEach(r => {
      const v = parseFloat(r.annual_co2_kg || '0') || 0;
      if (v <= 0) return;
      const ex = m.get(r.activity);
      m.set(r.activity, { v: (ex?.v || 0) + v, sector: r.sector });
    });
    return Array.from(m.entries()).map(([label, d]) => ({ label, sector: d.sector, value: d.v }));
  }, [rows]);

  if (!agg.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-12 text-center text-sm text-[#6b6860]">No emissions data</div>
  );

  const sectorTotals = Array.from(
    agg.reduce((m, x) => { m.set(x.sector, (m.get(x.sector) || 0) + x.value); return m; }, new Map<string, number>())
  ).map(([s, v]) => ({ s, v })).sort((a, b) => b.v - a.v);

  const total = sectorTotals.reduce((s, x) => s + x.v, 0);

  const sorted = [...agg].sort((a, b) =>
    sort === 'value' ? b.value - a.value : sort === 'sector' ? a.sector.localeCompare(b.sector) || b.value - a.value : a.label.localeCompare(b.label)
  );
  const filtered = sector ? sorted.filter(x => x.sector === sector) : sorted;
  const visible  = filtered.slice(0, topN);
  const maxVal   = Math.max(...visible.map(x => x.value), 1);
  const sel      = visible.find(x => x.label === picked) || visible[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Annual CO₂ Emissions</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">By activity · dynamically built from CSV columns</p>
        </div>
        <div className="rounded-xl border border-[#f4b896] bg-[#fff0e8] px-5 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#b05010]">Total / Year</p>
          <p className="mt-0.5 text-2xl font-black text-[#e2711d]">{(total / 1000).toFixed(1)}</p>
          <p className="text-[10px] text-[#b05010]">t CO₂e</p>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['value','sector','alpha'] as Sort[]).map(m => (
            <button key={m} type="button" onClick={() => setSort(m)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${sort === m ? 'border-[#2d6a4f] bg-[#2d6a4f] text-white' : 'border-[#e4e2dd] bg-white text-[#6b6860] hover:border-[#2d6a4f] hover:text-[#2d6a4f]'}`}>
              {m === 'value' ? 'By Value' : m === 'sector' ? 'By Sector' : 'A–Z'}
            </button>
          ))}
          <span className="ml-auto flex gap-1.5">
            {[6, 10, filtered.length].map((n, i) => (
              <button key={i} type="button" onClick={() => setTopN(n)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${topN === n ? 'border-[#2d6a4f] bg-[#edf7f0] text-[#2d6a4f]' : 'border-[#e4e2dd] bg-white text-[#6b6860] hover:border-[#2d6a4f]'}`}>
                {i === 2 ? 'All' : `Top ${n}`}
              </button>
            ))}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setSector(null)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${!sector ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-[#e4e2dd] bg-white text-[#6b6860] hover:border-[#1a1a1a]'}`}>
            All
          </button>
          {sectorTotals.map(({ s, v }) => {
            const c = SECTOR_COLORS[(sectorIdx.get(s) ?? 0) % SECTOR_COLORS.length];
            return (
              <button key={s} type="button" onClick={() => setSector(sector === s ? null : s)}
                style={sector === s ? { background: c.bg, borderColor: c.border } : undefined}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${sector === s ? '' : 'border-[#e4e2dd] bg-white text-[#6b6860] hover:border-[#1a1a1a]'}`}>
                <span style={sector === s ? { color: c.text } : undefined}>{s} · {((v / total) * 100).toFixed(0)}%</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-2">
            {visible.map(item => {
              const c = SECTOR_COLORS[(sectorIdx.get(item.sector) ?? 0) % SECTOR_COLORS.length];
              const isAct = sel?.label === item.label;
              return (
                <button key={item.label} type="button" onClick={() => setPicked(item.label)}
                  style={isAct ? { borderColor: c.border, background: c.bg } : undefined}
                  className={`w-full rounded-xl border p-4 text-left transition-all hover:border-[#c8c5be] ${isAct ? 'shadow-sm' : 'border-[#e4e2dd] bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ background: c.bg, borderColor: c.border, color: c.text }}>{item.sector}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1a1a1a]">{short(item.label, 36)}</span>
                    <span className="shrink-0 text-sm font-black" style={{ color: c.text }}>{((item.value / total) * 100).toFixed(1)}%</span>
                    <span className="shrink-0 text-xs text-[#6b6860]">{fmtT(item.value)} t</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#f4f2ee]">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct(item.value, maxVal), 4)}%`, background: c.bar }} />
                  </div>
                </button>
              );
            })}
          </div>

          {sel && (() => {
            const c = SECTOR_COLORS[(sectorIdx.get(sel.sector) ?? 0) % SECTOR_COLORS.length];
            return (
              <div className="space-y-3">
                <div className="rounded-xl border p-5" style={{ background: c.bg, borderColor: c.border }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: c.text }}>Selected Activity</p>
                  <p className="mt-2 text-base font-black leading-tight text-[#1a1a1a]">{sel.label}</p>
                  <span className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                    style={{ background: '#fff', borderColor: c.border, color: c.text }}>{sel.sector}</span>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      { l: 'CO₂ / yr', v: `${fmtT(sel.value)} t` },
                      { l: 'Share',    v: `${((sel.value / total) * 100).toFixed(1)}%` },
                      { l: 'Rank',     v: `#${visible.findIndex(x => x.label === sel.label) + 1}` },
                      { l: 'kg',       v: Math.round(sel.value).toLocaleString() },
                    ].map(card => (
                      <div key={card.l} className="rounded-lg border border-white/60 bg-white px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">{card.l}</p>
                        <p className="mt-0.5 text-base font-black" style={{ color: c.text }}>{card.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-[#e4e2dd] bg-[#f8f7f4] p-4">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#6b6860]">Sector Share</p>
                  <div className="space-y-2">
                    {sectorTotals.map(({ s, v }) => {
                      const sc = SECTOR_COLORS[(sectorIdx.get(s) ?? 0) % SECTOR_COLORS.length];
                      const sh = total > 0 ? (v / total) * 100 : 0;
                      return (
                        <button key={s} type="button" onClick={() => setSector(sector === s ? null : s)}
                          className="w-full rounded-lg border border-[#e4e2dd] bg-white p-2.5 text-left transition hover:bg-[#f4f2ee]">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-[#1a1a1a]">{s}</span>
                            <span style={{ color: sc.text }}>{sh.toFixed(1)}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-[#eceae5]">
                            <div className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(sh, 3)}%`, background: sc.bar }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function FactorsTable({ rows }: { rows: FactorRow[] }) {
  if (!rows.length) return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-10 text-center text-sm text-[#6b6860]">No emission factors</div>
  );

  const sources   = Array.from(new Set(rows.map(r => r.source).filter(Boolean)));
  const srcIdx    = new Map(sources.map((s, i) => [s, i] as const));
  const allKeys   = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set<string>()));
  const extraCols = allKeys.filter(k => !FACTOR_KNOWN.has(k));

  const pillFor = (source: string) => FACTOR_PILLS[(srcIdx.get(source) ?? 0) % FACTOR_PILLS.length];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#f0ede8] bg-[#f8f7f4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#1a1a1a]">Emission Factors</h3>
          <p className="mt-0.5 text-xs text-[#6b6860]">Reference values · {rows.length} entries · extra columns auto-rendered</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sources.map(s => (
            <span key={s} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${pillFor(s)}`}>{s}</span>
          ))}
        </div>
      </div>
      <div className="divide-y divide-[#f4f2ee]">
        {rows.map((row, i) => {
          const abbrev = row.category?.match(/\b\w/g)?.join('').toUpperCase().slice(0, 3) || row.category?.slice(0, 3).toUpperCase() || '—';
          const pill   = pillFor(row.source);
          return (
            <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f8f7f4]">
              <span className={`inline-flex min-w-10 justify-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${pill}`}>{abbrev}</span>
              <span className="min-w-[130px] flex-1 text-sm font-bold text-[#1a1a1a]">{titleCase(row.category || '')}</span>
              <span className="text-sm font-black text-[#1a1a1a]">{row.emission_factor}</span>
              {extraCols.map(col => row[col]?.trim() ? (
                <span key={col} className="rounded-full border border-[#e4e2dd] bg-[#f8f7f4] px-2 py-0.5 text-[10px] text-[#6b6860]">
                  <span className="font-semibold">{factorLabel(col)}:</span> {row[col]}
                </span>
              ) : null)}
              {row.source && <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${pill}`}>{row.source}</span>}
            </div>
          );
        })}
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

export default function Emissions({ vlcode }: { vlcode: string }) {
  const [rows, setRows]         = useState<EmissionRow[] | null>(null);
  const [factors, setFactors]   = useState<FactorRow[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!vlcode) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/emissions?vlcode=${vlcode}&_=${reloadKey}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/emission-factors?_=${reloadKey}`,            { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([em, fac]) => {
        if (cancelled) return;
        setRows(em.data || []);
        setFactors(fac.data || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vlcode, reloadKey]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setReloadKey(k => k + 1)}
          title="Refresh emissions & factor data"
          className="rounded-lg border border-[#e4e2dd] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b6860] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
        >
          ↻ Refresh
        </button>
      </div>
      <EmissionsChart rows={rows} />
      <FactorsTable rows={factors || []} />
    </div>
  );
}
