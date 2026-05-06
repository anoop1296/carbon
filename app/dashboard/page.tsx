'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import Overview,      { VillageRow } from '@/components/tabs/Overview';
import Emissions                     from '@/components/tabs/Emissions';
import Sequestration                 from '@/components/tabs/Sequestration';
import Interventions                 from '@/components/tabs/Interventions';
import CarbonBudget                  from '@/components/tabs/CarbonBudget';
import Scenarios                     from '@/components/tabs/Scenarios';
import Activity                      from '@/components/tabs/Activity';

type Tab = 'overview' | 'emissions' | 'sequestration' | 'interventions' | 'budget' | 'scenario';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',      label: 'Overview',     icon: 'M' },
  { id: 'emissions',     label: 'Emissions',     icon: 'E' },
  { id: 'sequestration', label: 'Sequestration', icon: 'S' },
  { id: 'interventions', label: 'Interventions', icon: 'I' },
  { id: 'budget',        label: 'Carbon Budget', icon: 'B' },
  { id: 'scenario',      label: 'Scenarios',     icon: 'P' },
];

function villageName(v: VillageRow) { return Object.values(v)[1] || Object.values(v)[0] || '—'; }
function villagePk(v: VillageRow)   { return Object.values(v)[0] || ''; }

function csvEsc(v: unknown) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv<T extends object>(rows: T[]) {
  if (!rows.length) return 'No data';
  const ks = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set<string>()));
  return [ks.join(','), ...rows.map(r => ks.map(k => csvEsc(r[k as keyof T])).join(','))].join('\n');
}

// ── Village picker ────────────────────────────────────────────────────────
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
          <div className="border-b border-[#f0ede8] p-2">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-[#e4e2dd] bg-[#f8f7f4] px-3 py-1.5 text-sm outline-none focus:border-[#2d6a4f]" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {visible.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-[#6b6860]">No villages found</p>
              : visible.map((v, i) => {
                  const pk = villagePk(v);
                  const isAct = selected ? villagePk(selected) === pk : false;
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

// ── Dashboard shell ───────────────────────────────────────────────────────
export default function Dashboard() {
  const [villages, setVillages]           = useState<VillageRow[]>([]);
  const [selected, setSelected]           = useState<VillageRow | null>(null);
  const [villagesLoading, setVilLoading]  = useState(true);
  const [activeTab, setActiveTab]         = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [isMobile, setIsMobile]           = useState(false);
  const contentRef                        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    fetch('/api/village', { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        const list: VillageRow[] = res.data || [];
        setVillages(list);
        if (list.length) setSelected(list[0]);
      })
      .finally(() => setVilLoading(false));
  }, []);

  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobile) setSidebarOpen(false);
  };

  const handleExport = () => {
    if (!selected) return;
    const out = ['# Village\n' + toCsv([selected])].join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv' }));
    a.download = `${villageName(selected).replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const vlcode         = selected ? villagePk(selected) : '';
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
        border-r border-[#e4e2dd] bg-white transition-transform duration-200
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

        {/* nav — one button per tab */}
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

        {/* footer */}
        <div className="grid grid-cols-3 gap-1.5 border-t border-[#f0ede8] p-3">
          {[{ href: '/admin', label: 'Admin' }, { href: '/', label: 'Home' }].map(({ href, label }) => (
            <Link key={href} href={href}
              className="rounded-lg border border-[#e4e2dd] py-1.5 text-center text-[11px] font-semibold text-[#6b6860] transition-colors hover:border-[#2d6a4f] hover:text-[#2d6a4f]">
              {label}
            </Link>
          ))}
          <button type="button" onClick={handleExport} disabled={!selected}
            className="rounded-lg border border-[#e4e2dd] py-1.5 text-center text-[11px] font-semibold text-[#6b6860] transition-colors hover:border-[#2d6a4f] hover:text-[#2d6a4f] disabled:opacity-40">
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
          <span className="text-xs text-[#6b6860]">Dashboard</span>
          <span className="text-xs text-[#c8c5be]">/</span>
          <span className="text-sm font-bold text-[#1a1a1a]">{activeTabLabel}</span>
          <div className="flex-1" />
          <VillagePicker
            villages={villages}
            selected={selected}
            onSelect={v => { setSelected(v); if (isMobile) setSidebarOpen(false); }}
            loading={villagesLoading}
          />
        </header>

        {/* content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 md:p-6">
          {villagesLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[#6b6860]">Loading villages…</div>
          ) : !selected ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <p className="text-sm text-[#6b6860]">Select a village to begin</p>
              <VillagePicker villages={villages} selected={null} onSelect={setSelected} loading={villagesLoading} />
            </div>
          ) : (
            <div className="mx-auto max-w-7xl space-y-5">
              {activeTab === 'overview'      && (
                <>
                  <Overview village={selected} />
                  <Activity vlcode={vlcode} />
                </>
              )}
              {activeTab === 'emissions'     && <Emissions     vlcode={vlcode} />}
              {activeTab === 'sequestration' && <Sequestration vlcode={vlcode} />}
              {activeTab === 'interventions' && <Interventions vlcode={vlcode} />}
              {activeTab === 'budget'        && <CarbonBudget  vlcode={vlcode} />}
              {activeTab === 'scenario'      && <Scenarios     vlcode={vlcode} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
