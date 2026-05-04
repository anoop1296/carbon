'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import EmissionsChart, { EmissionRow } from '@/components/EmissionsChart';
import CarbonBudgetCard, { BudgetRow } from '@/components/CarbonBudgetCard';
import ScenarioProjection, { ScenarioRow } from '@/components/ScenarioProjection';
import MonthlyActivity, { MonthlyRow } from '@/components/MonthlyActivity';
import {
  SequestrationCard, SeqBeforeRow, SeqAfterRow,
  EmissionFactors, FactorRow,
} from '@/components/SequestrationCard';
import InterventionReductions, { ReductionRow } from '@/components/InterventionReductions';

export type VillageRow = Record<string, string>;

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

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',      label: 'Overview',       icon: 'M' },
  { id: 'emissions',     label: 'Emissions',       icon: 'E' },
  { id: 'sequestration', label: 'Sequestration',   icon: 'S' },
  { id: 'interventions', label: 'Interventions',   icon: 'I' },
  { id: 'budget',        label: 'Carbon Budget',   icon: 'B' },
  { id: 'scenario',      label: 'Scenarios',       icon: 'P' },
  { id: 'activity',      label: 'Activity',        icon: 'A' },
];

const CARD_COLORS = [
  { bg: 'bg-[#edf7f0]', border: 'border-[#b7dfc4]', num: 'text-[#2d6a4f]', label: 'text-[#4a7c59]' },
  { bg: 'bg-[#fef9ec]', border: 'border-[#f6dfa0]', num: 'text-[#92610e]', label: 'text-[#a0761e]' },
  { bg: 'bg-[#eef2fb]', border: 'border-[#bccef4]', num: 'text-[#2a4fa3]', label: 'text-[#3a5fb3]' },
  { bg: 'bg-[#fef0ed]', border: 'border-[#f4c0b2]', num: 'text-[#b0380d]', label: 'text-[#c0481d]' },
  { bg: 'bg-[#f4eefe]', border: 'border-[#d0b8f8]', num: 'text-[#6320b0]', label: 'text-[#7330c0]' },
  { bg: 'bg-[#ecfbf8]', border: 'border-[#aae4d8]', num: 'text-[#0e7a68]', label: 'text-[#1e8a78]' },
  { bg: 'bg-[#fff4f4]', border: 'border-[#f8c0c0]', num: 'text-[#a01010]', label: 'text-[#b02020]' },
  { bg: 'bg-[#f0f9ff]', border: 'border-[#b8dff8]', num: 'text-[#0a5a8a]', label: 'text-[#1a6a9a]' },
];

function villageName(v: VillageRow) { return Object.values(v)[1] || Object.values(v)[0] || '—'; }
function villagePk(v: VillageRow)   { return Object.values(v)[0] || ''; }
function villageDistrict(v: VillageRow) {
  return Object.entries(v).slice(2).filter(([, val]) => val && isNaN(parseFloat(val))).map(([, val]) => val).join(' · ');
}
function toLabel(k: string) { return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function toSuffix(k: string) {
  if (/_ha$/i.test(k)) return 'ha';
  if (/_kg$/i.test(k)) return 'kg';
  if (/_kwh$/i.test(k)) return 'kWh';
  return '';
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function csvEsc(v: unknown) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv<T extends object>(rows: T[]) {
  if (!rows.length) return 'No data';
  const ks = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set<string>()));
  return [ks.join(','), ...rows.map(r => ks.map(k => csvEsc(r[k as keyof T])).join(','))].join('\n');
}

// ── Village stat cards ────────────────────────────────────────────────────
function VillageOverview({ v }: { v: VillageRow }) {
  const name     = villageName(v);
  const district = villageDistrict(v);
  const textMeta = Object.entries(v).slice(2).filter(([, val]) => val && isNaN(parseFloat(val)));
  const stats    = Object.entries(v).slice(2)
    .filter(([, val]) => { const n = parseFloat(val || ''); return Number.isFinite(n); })
    .map(([key, val], i) => ({ label: toLabel(key), suffix: toSuffix(key), value: parseFloat(val || '0'), c: CARD_COLORS[i % CARD_COLORS.length] }));

  return (
    <div className="space-y-6">
      {/* Identity strip */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#e4e2dd] bg-white px-6 py-5 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#2d6a4f] text-xl font-black text-white">
          {name.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black tracking-tight text-[#1a1a1a]">{name}</h2>
          {district && <p className="mt-0.5 text-sm text-[#6b6860]">{district}</p>}
          {textMeta.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {textMeta.map(([k, val]) => (
                <span key={k} className="rounded-full border border-[#e4e2dd] bg-[#f8f7f4] px-3 py-0.5 text-xs text-[#6b6860]">
                  <span className="font-semibold text-[#1a1a1a]">{toLabel(k)}:</span> {val}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic attribute cards — auto-renders every numeric column */}
      {stats.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6b6860]">Village Attributes</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {stats.map(stat => (
              <div key={stat.label}
                className={`rounded-xl border px-4 py-4 ${stat.c.bg} ${stat.c.border}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${stat.c.label}`}>{stat.label}</p>
                <p className={`mt-2 text-2xl font-black ${stat.c.num}`}>{fmtNum(stat.value)}</p>
                {stat.suffix && <p className={`mt-0.5 text-xs ${stat.c.label}`}>{stat.suffix}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#e4e2dd] bg-white p-10 text-center text-sm text-[#6b6860]">
          No numeric attributes found. Add columns from the admin panel.
        </div>
      )}
    </div>
  );
}

// ── Compact village picker ────────────────────────────────────────────────
function VillagePicker({ villages, selected, onSelect, loading }: {
  villages: VillageRow[];
  selected: VillageRow | null;
  onSelect: (v: VillageRow) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? villages.filter(v => villageName(v).toLowerCase().includes(s)) : villages;
  }, [q, villages]);

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={loading}
        onClick={() => !loading && setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#e4e2dd] bg-white px-3 py-2 text-sm font-semibold text-[#1a1a1a] shadow-sm transition hover:border-[#2d6a4f] disabled:opacity-50">
        <span className="max-w-[160px] truncate">{loading ? 'Loading…' : selected ? villageName(selected) : 'Select village'}</span>
        <svg className={`h-3.5 w-3.5 shrink-0 text-[#6b6860] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[100] mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#e4e2dd] bg-white shadow-xl">
          <div className="p-2 border-b border-[#f0ede8]">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-[#e4e2dd] bg-[#f8f7f4] px-3 py-1.5 text-sm outline-none focus:border-[#2d6a4f]" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {visible.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-[#6b6860]">No villages found</p>
              : visible.map((v, i) => {
                  const pk = villagePk(v); const isAct = selected ? villagePk(selected) === pk : false;
                  return (
                    <button key={pk || i} type="button"
                      onClick={() => { onSelect(v); setOpen(false); setQ(''); }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#f8f7f4] ${isAct ? 'bg-[#edf7f0]' : ''}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${isAct ? 'bg-[#2d6a4f] text-white' : 'bg-[#f0ede8] text-[#6b6860]'}`}>
                        {villageName(v).slice(0, 2).toUpperCase()}
                      </span>
                      <span className={`flex-1 truncate font-semibold ${isAct ? 'text-[#2d6a4f]' : 'text-[#1a1a1a]'}`}>{villageName(v)}</span>
                    </button>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const [villages, setVillages]               = useState<VillageRow[]>([]);
  const [selected, setSelected]               = useState<VillageRow | null>(null);
  const [dashData, setDashData]               = useState<DashData | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(true);
  const [activeTab, setActiveTab]             = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [isMobile, setIsMobile]               = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Always no-store so admin changes reflect immediately
  useEffect(() => {
    fetch('/api/village', { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        const list: VillageRow[] = res.data || [];
        setVillages(list);
        if (list.length) setSelected(list[0]);
      })
      .finally(() => setVillagesLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pk = selected ? villagePk(selected) : '';
    if (!pk) return;
    setLoading(true);
    const q = `?vlcode=${pk}`;
    const nc = { cache: 'no-store' } as RequestInit;
    Promise.all([
      fetch(`/api/emissions${q}`, nc).then(r => r.json()),
      fetch(`/api/carbon-budget${q}`, nc).then(r => r.json()),
      fetch(`/api/sequestration${q}`, nc).then(r => r.json()),
      fetch(`/api/reductions${q}`, nc).then(r => r.json()),
      fetch(`/api/scenario${q}`, nc).then(r => r.json()),
      fetch(`/api/monthly${q}`, nc).then(r => r.json()),
      fetch('/api/emission-factors', nc).then(r => r.json()),
    ]).then(([em, bud, seq, red, scen, mon, fac]) => {
      setDashData({
        emissions:    em.data    || [],
        budgetBefore: bud.before || [],
        budgetAfter:  bud.after  || [],
        seqBefore:    seq.before || [],
        seqAfter:     seq.after  || [],
        reductions:   red.data   || [],
        scenario:     scen.data  || [],
        monthly:      mon.data   || [],
        factors:      fac.data   || [],
      });
    }).finally(() => setLoading(false));
  }, [selected ? villagePk(selected) : '']);

  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobile) setSidebarOpen(false);
  };

  const handleExport = () => {
    if (!selected || !dashData) return;
    const out = [
      '# Village\n' + toCsv([selected]),
      '# Emissions\n' + toCsv(dashData.emissions),
      '# Carbon Budget Before\n' + toCsv(dashData.budgetBefore),
      '# Carbon Budget After\n' + toCsv(dashData.budgetAfter),
      '# Sequestration Before\n' + toCsv(dashData.seqBefore),
      '# Sequestration After\n' + toCsv(dashData.seqAfter),
      '# Interventions\n' + toCsv(dashData.reductions),
      '# Scenario\n' + toCsv(dashData.scenario),
      '# Monthly Activity\n' + toCsv(dashData.monthly),
    ].join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv' }));
    a.download = `${villageName(selected).replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f7f4]">

      {/* mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── LEFT RAIL ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col
        border-r border-[#e4e2dd] bg-white
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* logo */}
        <div className="flex items-center gap-2.5 border-b border-[#f0ede8] px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2d6a4f] text-sm font-black text-white">C</span>
          <div>
            <p className="text-sm font-black text-[#1a1a1a]">Carbon</p>
            <p className="text-[10px] text-[#6b6860]">SLCR</p>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto text-[#6b6860] hover:text-[#1a1a1a]">✕</button>
          )}
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => handleTab(tab.id)}
                className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all
                  ${active ? 'bg-[#2d6a4f] text-white' : 'text-[#4a4840] hover:bg-[#f4f2ee] hover:text-[#1a1a1a]'}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black
                  ${active ? 'bg-white/20 text-white' : 'bg-[#e8e5df] text-[#6b6860]'}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* footer links */}
        <div className="border-t border-[#f0ede8] p-3 grid grid-cols-3 gap-1.5">
          {[
            { href: '/admin', label: 'Admin' },
            { href: '/',      label: 'Home'  },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="rounded-lg border border-[#e4e2dd] py-1.5 text-center text-[11px] font-semibold text-[#6b6860] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">
              {label}
            </Link>
          ))}
          <button type="button" onClick={handleExport} disabled={!selected || !dashData || loading}
            className="rounded-lg border border-[#e4e2dd] py-1.5 text-center text-[11px] font-semibold text-[#6b6860] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors disabled:opacity-40">
            CSV
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* top bar */}
        <header className="relative z-[90] flex shrink-0 items-center gap-3 border-b border-[#e4e2dd] bg-white px-4 py-3 shadow-sm">
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e2dd] text-[#6b6860] hover:bg-[#f8f7f4] md:hidden">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden h-4 w-px bg-[#e4e2dd] md:block" />

          {/* breadcrumb */}
          <span className="text-xs text-[#6b6860]">Dashboard</span>
          <span className="text-xs text-[#c8c5be]">/</span>
          <span className="text-sm font-bold text-[#1a1a1a]">{activeTabLabel}</span>

          <div className="flex-1" />

          {/* village picker lives in topbar */}
          <VillagePicker villages={villages} selected={selected}
            onSelect={v => { setSelected(v); if (isMobile) setSidebarOpen(false); }}
            loading={villagesLoading} />

          {loading && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#b7dfc4] bg-[#edf7f0] px-3 py-1">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#b7dfc4] border-t-[#2d6a4f]" />
              <span className="text-[10px] font-bold text-[#2d6a4f]">Loading</span>
            </div>
          )}
        </header>

        {/* content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          {villagesLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[#6b6860]">Loading villages…</div>
          ) : !selected ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <p className="text-sm text-[#6b6860]">Select a village to begin</p>
              <VillagePicker villages={villages} selected={null} onSelect={setSelected} loading={villagesLoading} />
            </div>
          ) : loading && !dashData ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d8f3dc] border-t-[#2d6a4f]" />
            </div>
          ) : (
            <div className="space-y-5 max-w-7xl mx-auto">
              {activeTab === 'overview'      && <VillageOverview v={selected} />}
              {activeTab === 'emissions'     && <EmissionsChart rows={dashData?.emissions} />}
              {activeTab === 'sequestration' && <SequestrationCard before={dashData?.seqBefore} after={dashData?.seqAfter} />}
              {activeTab === 'interventions' && <InterventionReductions rows={dashData?.reductions} />}
              {activeTab === 'budget'        && <CarbonBudgetCard before={dashData?.budgetBefore} after={dashData?.budgetAfter} />}
              {activeTab === 'scenario'      && <ScenarioProjection rows={dashData?.scenario} />}
              {activeTab === 'activity'      && (
                <div className="space-y-5">
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
