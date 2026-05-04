'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VillageRow } from '@/components/VillageHeader';
import EmissionsChart, { EmissionRow } from '@/components/EmissionsChart';
import CarbonBudgetCard, { BudgetRow } from '@/components/CarbonBudgetCard';
import ScenarioProjection, { ScenarioRow } from '@/components/ScenarioProjection';
import MonthlyActivity, { MonthlyRow } from '@/components/MonthlyActivity';
import {
  SequestrationCard,
  SeqBeforeRow,
  SeqAfterRow,
  EmissionFactors,
  FactorRow,
} from '@/components/SequestrationCard';
import InterventionReductions, { ReductionRow } from '@/components/InterventionReductions';

// ── types ─────────────────────────────────────────────────────────────────
interface DashData {
  emissions: EmissionRow[];
  budgetBefore: BudgetRow[];
  budgetAfter: BudgetRow[];
  seqBefore: SeqBeforeRow[];
  seqAfter: SeqAfterRow[];
  reductions: ReductionRow[];
  scenario: ScenarioRow[];
  monthly: MonthlyRow[];
  factors: FactorRow[];
}

type Tab = 'overview' | 'emissions' | 'budget' | 'scenario' | 'sequestration' | 'interventions' | 'activity';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview',      label: 'Overview',      icon: '🏘️', desc: 'Village profile & attributes'   },
  { id: 'emissions',     label: 'Emissions',     icon: '🌫️', desc: 'Annual CO₂ by sector'           },
  { id: 'sequestration', label: 'Sequestration', icon: '🌳', desc: 'Carbon sink sources'             },
  { id: 'interventions', label: 'Interventions', icon: '⚡', desc: 'CO₂ reduction actions'           },
  { id: 'budget',        label: 'Carbon Budget', icon: '📊', desc: 'Before vs after comparison'      },
  { id: 'scenario',      label: 'Scenarios',     icon: '📈', desc: 'BAU · LOS · Accelerated'         },
  { id: 'activity',      label: 'Activity',      icon: '📅', desc: 'Monthly consumption data'        },
];

const STAT_PALETTE = [
  { border: 'border-l-4 border-l-emerald-500', icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-700' },
  { border: 'border-l-4 border-l-blue-500',    icon: 'bg-blue-100 text-blue-700',       value: 'text-blue-700'    },
  { border: 'border-l-4 border-l-violet-500',  icon: 'bg-violet-100 text-violet-700',   value: 'text-violet-700'  },
  { border: 'border-l-4 border-l-amber-500',   icon: 'bg-amber-100 text-amber-700',     value: 'text-amber-700'   },
  { border: 'border-l-4 border-l-red-500',     icon: 'bg-red-100 text-red-700',         value: 'text-red-700'     },
  { border: 'border-l-4 border-l-cyan-500',    icon: 'bg-cyan-100 text-cyan-700',       value: 'text-cyan-700'    },
  { border: 'border-l-4 border-l-pink-500',    icon: 'bg-pink-100 text-pink-700',       value: 'text-pink-700'    },
  { border: 'border-l-4 border-l-teal-500',    icon: 'bg-teal-100 text-teal-700',       value: 'text-teal-700'    },
  { border: 'border-l-4 border-l-orange-500',  icon: 'bg-orange-100 text-orange-700',   value: 'text-orange-700'  },
  { border: 'border-l-4 border-l-indigo-500',  icon: 'bg-indigo-100 text-indigo-700',   value: 'text-indigo-700'  },
];

// ── helpers ───────────────────────────────────────────────────────────────
function toLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function toSuffix(key: string): string {
  if (/_ha$/i.test(key)) return 'ha';
  if (/_kg$/i.test(key)) return 'kg';
  if (/_kwh$/i.test(key)) return 'kWh';
  return '';
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0] || '').join('').toUpperCase().slice(0, 2);
}

// col[0] = pk, col[1] = display name — no hardcoded field names
function villageName(v: VillageRow): string {
  return Object.values(v)[1] || Object.values(v)[0] || '—';
}
function villagePk(v: VillageRow): string {
  return Object.values(v)[0] || '';
}
// text columns after pk+name (non-numeric, not pk, not name)
function villageTextMeta(v: VillageRow): string {
  return Object.entries(v)
    .slice(2)
    .filter(([, val]) => val && isNaN(parseFloat(val)))
    .map(([, val]) => val)
    .join(', ');
}

// ── VillageOverview ────────────────────────────────────────────────────────
// col[0]=pk col[1]=display name — skip both, show all other numeric cols as stat cards
function VillageOverview({ v }: { v: VillageRow }) {
  const name = villageName(v);
  const meta = villageTextMeta(v);

  const stats = Object.entries(v)
    .slice(2) // skip pk + name
    .filter(([, val]) => { const n = parseFloat(val || ''); return Number.isFinite(n); })
    .map(([key, val], idx) => ({
      label:  toLabel(key),
      suffix: toSuffix(key),
      value:  parseFloat(val || '0'),
      tone:   STAT_PALETTE[idx % STAT_PALETTE.length],
    }));

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <div className="flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{name}</h2>
          {meta && <p className="mt-1 text-sm text-slate-500">{meta}</p>}
        </div>
      </div>

      {/* Dynamic stat grid */}
      {stats.length > 0 ? (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Village Attributes</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${stat.tone.border}`}>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{stat.label}</div>
                <div className={`mt-2 text-2xl font-bold ${stat.tone.value}`}>{formatNum(stat.value)}</div>
                {stat.suffix && <div className="mt-0.5 text-[11px] text-slate-400">{stat.suffix}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
          No numeric attributes found. Add data columns from the admin panel.
        </div>
      )}
    </div>
  );
}

// ── VillageDropdown ────────────────────────────────────────────────────────
function VillageDropdown({
  villages,
  selected,
  onSelect,
  loading,
}: {
  villages: VillageRow[];
  selected: VillageRow | null;
  onSelect: (v: VillageRow) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? villages.filter((v) => villageName(v).toLowerCase().includes(query)) : villages;
  }, [q, villages]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={loading}
        onClick={() => !loading && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition ${
          open ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
        } bg-white disabled:opacity-60`}
      >
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900">
            {loading ? 'Loading…' : (selected ? villageName(selected) : 'Select village')}
          </div>
          {selected && (
            <div className="mt-0.5 truncate text-xs text-slate-500">{villageTextMeta(selected)}</div>
          )}
        </div>
        <svg className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search villages…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-slate-400">No villages found</div>
            ) : (
              visible.map((v, i) => {
                const pk = villagePk(v);
                const name = villageName(v);
                const meta = villageTextMeta(v);
                const isActive = selected ? villagePk(selected) === pk : false;
                return (
                  <button
                    key={pk || i}
                    type="button"
                    onClick={() => { onSelect(v); setOpen(false); setQ(''); }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${isActive ? 'bg-emerald-50' : ''}`}
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-900'}`}>{name}</div>
                      {meta && <div className="truncate text-xs text-slate-400">{meta}</div>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV export helper ─────────────────────────────────────────────────────
function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function rowsToCsv<T extends object>(rows: T[]): string {
  if (!rows.length) return 'No data';
  const headers = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  return [headers.join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h as keyof T])).join(','))].join('\n');
}

// ── main dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [villages, setVillages]         = useState<VillageRow[]>([]);
  const [selected, setSelected]         = useState<VillageRow | null>(null);
  const [dashData, setDashData]         = useState<DashData | null>(null);
  const [loading, setLoading]           = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(true);
  const [activeTab, setActiveTab]       = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // responsive
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // load village list
  useEffect(() => {
    fetch('/api/village')
      .then((r) => r.json())
      .then((res) => {
        const list: VillageRow[] = res.data || [];
        setVillages(list);
        if (list.length) setSelected(list[0]);
      })
      .finally(() => setVillagesLoading(false));
  }, []);

  // load dash data when village changes
  useEffect(() => {
    const pk = selected ? villagePk(selected) : '';
    if (!pk) return;
    setLoading(true);
    const q = `?vlcode=${pk}`;
    Promise.all([
      fetch(`/api/emissions${q}`).then((r) => r.json()),
      fetch(`/api/carbon-budget${q}`).then((r) => r.json()),
      fetch(`/api/sequestration${q}`).then((r) => r.json()),
      fetch(`/api/reductions${q}`).then((r) => r.json()),
      fetch(`/api/scenario${q}`).then((r) => r.json()),
      fetch(`/api/monthly${q}`).then((r) => r.json()),
      fetch('/api/emission-factors').then((r) => r.json()),
    ])
      .then(([em, bud, seq, red, scen, mon, fac]) => {
        setDashData({
          emissions:   em.data    || [],
          budgetBefore: bud.before || [],
          budgetAfter:  bud.after  || [],
          seqBefore:   seq.before  || [],
          seqAfter:    seq.after   || [],
          reductions:  red.data    || [],
          scenario:    scen.data   || [],
          monthly:     mon.data    || [],
          factors:     fac.data    || [],
        });
      })
      .finally(() => setLoading(false));
  }, [selected ? villagePk(selected) : '']);

  // tab change → scroll content to top
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobile) setSidebarOpen(false);
  };

  // csv export
  const handleExport = () => {
    if (!selected || !dashData) return;
    const sections = [
      '# Village\n' + rowsToCsv([selected]),
      '# Emissions\n' + rowsToCsv(dashData.emissions),
      '# Carbon Budget Before\n' + rowsToCsv(dashData.budgetBefore),
      '# Carbon Budget After\n'  + rowsToCsv(dashData.budgetAfter),
      '# Sequestration Before\n' + rowsToCsv(dashData.seqBefore),
      '# Sequestration After\n'  + rowsToCsv(dashData.seqAfter),
      '# Interventions\n'        + rowsToCsv(dashData.reductions),
      '# Scenario\n'             + rowsToCsv(dashData.scenario),
      '# Monthly Activity\n'     + rowsToCsv(dashData.monthly),
    ].join('\n\n');
    const blob = new Blob([sections], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${villageName(selected).replace(/\s+/g, '_')}_${villagePk(selected)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">

      {/* mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 flex w-64 flex-col
          border-r border-slate-200 bg-white shadow-sm
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* brand */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">C</div>
            <div>
              <div className="text-sm font-bold text-slate-900">Carbon DSS</div>
              <div className="text-[11px] text-slate-400">SLCR — Varanasi</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
              ✕
            </button>
          )}
        </div>

        {/* village selector */}
        <div className="border-b border-slate-100 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Active Village</div>
          <VillageDropdown
            villages={villages}
            selected={selected}
            onSelect={(v) => { setSelected(v); if (isMobile) setSidebarOpen(false); }}
            loading={villagesLoading}
          />
          {selected && (() => {
            const textFields = Object.entries(selected).slice(2).filter(([, v]) => v && isNaN(parseFloat(v)));
            return textFields.length > 0 ? (
              <div className="mt-2.5 space-y-1 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
                {textFields.map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="flex-shrink-0 text-slate-400">{toLabel(key)}</span>
                    <span className="truncate font-medium text-slate-700 text-right">{val}</span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Sections</div>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold leading-tight ${isActive ? 'text-white' : ''}`}>{tab.label}</div>
                  <div className={`mt-0.5 text-[10px] leading-tight ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>{tab.desc}</div>
                </div>
                {isActive && (
                  <svg className="h-3.5 w-3.5 flex-shrink-0 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </nav>

        {/* footer */}
        <div className="flex gap-2 border-t border-slate-100 px-3 py-3">
          <Link href="/admin" className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-[11px] font-semibold text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700">
            Admin
          </Link>
          <Link href="/" className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-[11px] font-semibold text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700">
            Home
          </Link>
          <button
            type="button"
            onClick={handleExport}
            disabled={!selected || !dashData || loading}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-[11px] font-semibold text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
          >
            Export
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* mobile-only topbar — just the hamburger */}
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />}
        </header>

        {/* content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 md:p-6">
          {villagesLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading villages…</div>
          ) : !selected ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <div className="text-sm text-slate-400">Select a village from the sidebar to begin</div>
              <div className="w-72">
                <VillageDropdown villages={villages} selected={null} onSelect={setSelected} loading={villagesLoading} />
              </div>
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'overview'      && <VillageOverview v={selected} />}
              {activeTab === 'emissions'     && <EmissionsChart rows={dashData?.emissions} />}
              {activeTab === 'sequestration' && <SequestrationCard before={dashData?.seqBefore} after={dashData?.seqAfter} />}
              {activeTab === 'interventions' && <InterventionReductions rows={dashData?.reductions} />}
              {activeTab === 'budget'        && <CarbonBudgetCard before={dashData?.budgetBefore} after={dashData?.budgetAfter} />}
              {activeTab === 'scenario'      && <ScenarioProjection rows={dashData?.scenario} />}
              {activeTab === 'activity'      && (
                <div className="space-y-6">
                  <MonthlyActivity rows={dashData?.monthly} />
                  <EmissionFactors rows={dashData?.factors} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
