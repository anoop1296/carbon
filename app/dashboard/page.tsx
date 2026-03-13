// frontend/app/dashboard/page.tsx
'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import VillageHeader, { VillageRow } from '@/components/VillageHeader';
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

type CsvRow = Record<string, unknown>;

type Tab = 'overview' | 'emissions' | 'budget' | 'scenario' | 'sequestration' | 'interventions' | 'activity';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'emissions', label: 'Emissions' },
  { id: 'sequestration', label: 'Sequestration' },
  { id: 'interventions', label: 'Interventions' },
  { id: 'budget', label: 'Carbon Budget' },
  { id: 'scenario', label: 'Scenarios' },
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function rowsToCsv(rows: CsvRow[]): string {
  if (!rows.length) return 'No data';
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const lines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function buildCsvSection(title: string, rows: CsvRow[]): string {
  return [`${title}`, rowsToCsv(rows)].join('\n');
}

// Hyper-realistic particle system for backgrounds
function AmbientParticles({ color = 'rgba(117,166,231,0.1)' }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const withAlpha = useCallback((input: string, alpha: number) => {
    const a = Math.max(0, Math.min(1, alpha));
    const rgbaMatch = input.match(
      /^rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]*\.?[0-9]+)\s*\)$/i
    );
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${a})`;
    }

    const rgbMatch = input.match(
      /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i
    );
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${a})`;
    }

    const hex = input.replace('#', '').trim();
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (/^[0-9a-f]{6}$/i.test(hex) || /^[0-9a-f]{8}$/i.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    return `rgba(117,166,231,${a})`;
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let time = 0;
    
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    
    window.addEventListener('resize', resize);
    
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 2 + Math.random() * 3,
      life: Math.random()
    }));
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.002;
        
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height || p.life <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.vx = (Math.random() - 0.5) * 0.5;
          p.vy = (Math.random() - 0.5) * 0.5;
          p.life = 1;
        }
        
        const alpha = p.life * 0.6;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, withAlpha(color, alpha));
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      time++;
      requestAnimationFrame(animate);
    };
    animate();
    
    return () => window.removeEventListener('resize', resize);
  }, [color, withAlpha]);
  
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

// Holographic 3D Dropdown
function HolographicVillageDropdown({
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
    const onDocClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const visibleVillages = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return villages;
    return villages.filter((v) => v.village_name.toLowerCase().includes(query));
  }, [q, villages]);

  return (
    <div ref={ref} className="relative w-full">
      <div className="mb-2 text-xs font-semibold text-gray-700">
        Village Selection
      </div>

      <button
        className={`
          w-full rounded-md border px-3 py-2.5 text-left text-sm
          bg-white text-gray-900 transition-colors
          ${open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'}
          ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
        `}
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={loading}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="truncate font-medium">
              {loading ? 'Loading villages...' : selected?.village_name || 'Select village'}
            </div>
            {selected && (
              <div className="mt-0.5 text-xs text-gray-500">
                {selected.district}, {selected.state}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            ▼
          </div>
        </div>
      </button>

      {/* Simple dropdown panel */}
      {open && villages.length > 0 && (
        <div
          className="
            absolute left-0 right-0 mt-2 max-h-80 overflow-hidden rounded-md
            bg-white border border-gray-200 shadow-md
            z-50
          "
        >
          <div className="sticky top-0 bg-white p-2 border-b border-gray-200 z-10">
            <div className="relative">
              <input
                className="
                  w-full px-3 py-2 rounded-md border border-gray-300
                  bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  placeholder:text-gray-400 text-gray-900 text-sm
                  focus:outline-none
                "
                placeholder="Search villages..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {visibleVillages.map((v) => {
              const isSelected = selected?.vlcode === v.vlcode;
              
              return (
                <div
                  key={v.vlcode}
                  className={`
                    px-3 py-2.5 cursor-pointer transition-colors
                    hover:bg-gray-50
                    ${isSelected 
                      ? 'bg-blue-50 ring-1 ring-blue-200 font-semibold' 
                      : ''
                    }
                  `}
                  onClick={() => {
                    onSelect(v);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold
                        ${isSelected 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700'
                        }
                        transition-colors
                      `}>
                        {isSelected ? '✓' : '•'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {v.village_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                          {v.district}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      VL-{v.vlcode}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {visibleVillages.length === 0 && (
              <div className="px-4 py-6 text-center">
                <div className="text-gray-500 text-sm">No villages found</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Ultra-realistic KPI Cards
function HolographicKPICard({
  label,
  value,
  sub,
  accent,
  icon,
  delay = 0,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: string;
  delay?: number;
}) {
  const toneStyles: Record<string, { badge: string; ring: string; soft: string }> = {
    '#ef4444': { badge: 'bg-red-100 text-red-700', ring: 'hover:border-red-200', soft: 'text-red-600' },
    '#10b981': { badge: 'bg-emerald-100 text-emerald-700', ring: 'hover:border-emerald-200', soft: 'text-emerald-600' },
    '#8b5cf6': { badge: 'bg-violet-100 text-violet-700', ring: 'hover:border-violet-200', soft: 'text-violet-600' },
    '#3b82f6': { badge: 'bg-blue-100 text-blue-700', ring: 'hover:border-blue-200', soft: 'text-blue-600' },
  };
  const tone = toneStyles[accent] || { badge: 'bg-slate-100 text-slate-700', ring: 'hover:border-slate-200', soft: 'text-slate-600' };

  return (
    <div
      className={`
        rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5 ${tone.ring}
      `}
      style={{ animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold tracking-wide text-gray-600 uppercase">{label}</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
          <div className={`mt-1 text-sm ${tone.soft}`}>{sub}</div>
        </div>
        <div className={`h-9 w-9 rounded-lg text-sm font-semibold flex items-center justify-center ${tone.badge}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Enhanced Sidebar with glassmorphism + 3D
function HolographicSidebar({ 
  sidebarOpen, 
  setSidebarOpen,
  isMobile,
  villagesLoading,
  villages,
  selected,
  setSelected
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  villagesLoading: boolean;
  villages: VillageRow[];
  selected: VillageRow | null;
  setSelected: (v: VillageRow) => void;
}) {
  return (
    <aside
      className={`
        fixed md:sticky top-0 left-0 h-screen w-72 md:w-[280px] z-50
        bg-gray-100 border-r border-gray-200
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Carbon Dashboard</h1>
            <p className="text-xs text-gray-600 mt-1">SLCR - Varanasi</p>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Village selector */}
      <div className="p-4">
        <HolographicVillageDropdown
          villages={villages}
          selected={selected}
          onSelect={(v) => {
            setSelected(v);
          }}
          loading={villagesLoading}
        />
      </div>
    </aside>
  );
}

export default function UltraRealisticDashboard() {
  const [villages, setVillages] = useState<VillageRow[]>([]);
  const [selected, setSelected] = useState<VillageRow | null>(null);
  const [dashData, setDashData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ... (keep existing useEffect logic unchanged)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch('/api/village')
      .then((r) => r.json())
      .then((res) => {
        const list = res.data || [];
        setVillages(list);
        if (list.length) setSelected(list[0]);
        setVillagesLoading(false);
      })
      .catch(() => setVillagesLoading(false));
  }, []);

  useEffect(() => {
    if (!selected?.vlcode) return;
    setLoading(true);

    const q = `?vlcode=${selected.vlcode}`;

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
          emissions: em.data || [],
          budgetBefore: bud.before || [],
          budgetAfter: bud.after || [],
          seqBefore: seq.before || [],
          seqAfter: seq.after || [],
          reductions: red.data || [],
          scenario: scen.data || [],
          monthly: mon.data || [],
          factors: fac.data || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selected?.vlcode]);

  const getVal = (rows: BudgetRow[], key: string) =>
    parseFloat(rows.find((r) => r.parameter?.toLowerCase().includes(key.toLowerCase()))?.value || '0');

  const pctRed = dashData ? getVal(dashData.budgetAfter, 'percentage') : 0;
  const reductionTons = dashData
    ? dashData.reductions.reduce((sum, r) => sum + (parseFloat(r.annual_co2_reduction_kg || '0') || 0), 0) / 1000
    : 0;

  const handleExportCsv = () => {
    if (!selected || !dashData) return;

    const safeVillage = selected.village_name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sections = [
      buildCsvSection('Village', [selected as unknown as CsvRow]),
      buildCsvSection('Emissions', (dashData.emissions || []) as unknown as CsvRow[]),
      buildCsvSection('Carbon Budget - Before', (dashData.budgetBefore || []) as unknown as CsvRow[]),
      buildCsvSection('Carbon Budget - After', (dashData.budgetAfter || []) as unknown as CsvRow[]),
      buildCsvSection('Sequestration - Before', (dashData.seqBefore || []) as unknown as CsvRow[]),
      buildCsvSection('Sequestration - After', (dashData.seqAfter || []) as unknown as CsvRow[]),
      buildCsvSection('Interventions', (dashData.reductions || []) as unknown as CsvRow[]),
      buildCsvSection('Scenario', (dashData.scenario || []) as unknown as CsvRow[]),
      buildCsvSection('Monthly Activity', (dashData.monthly || []) as unknown as CsvRow[]),
      buildCsvSection('Emission Factors', (dashData.factors || []) as unknown as CsvRow[]),
    ];

    const csvContent = sections.join('\n\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeVillage}_${selected.vlcode}_all_api_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 relative overflow-hidden">
      {/* Global ambient particles */}
      <AmbientParticles color="rgba(117,166,231,0.03)" />
      
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/30 to-emerald-900/20 backdrop-blur-xl z-40 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <HolographicSidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        villagesLoading={villagesLoading}
        villages={villages}
        selected={selected}
        setSelected={setSelected}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Holographic Topbar */}
        <header className="sticky top-0 z-40 backdrop-blur-3xl bg-white/95 border-b border-slate-200/60 shadow-glow-xl px-4 md:px-10 py-4 md:py-5 flex items-center justify-between relative overflow-hidden">
          <AmbientParticles color="rgba(255,255,255,0.1)" />
          <div className="flex items-center gap-3 md:gap-5 min-w-0">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <span className="relative block h-4 w-5">
                <span className={`absolute left-0 h-0.5 w-5 bg-current transition-all duration-200 ${sidebarOpen ? 'top-2 rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 top-2 h-0.5 w-5 bg-current transition-opacity duration-200 ${sidebarOpen ? 'opacity-0' : 'opacity-100'}`} />
                <span className={`absolute left-0 h-0.5 w-5 bg-current transition-all duration-200 ${sidebarOpen ? 'top-2 -rotate-45' : 'top-4'}`} />
              </span>
            </button>

            <div className="relative min-w-0">
              <h2 className="text-xl font-bold text-gray-900 max-w-[220px] md:max-w-none truncate">
                {selected?.village_name || 'Select Village'}
              </h2>
              <div className="mt-0.5 text-sm text-gray-600 truncate">
                {selected ? `${selected.district}, ${selected.state}` : TABS.find((t) => t.id === activeTab)?.label}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!selected || !dashData || loading}
              className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 md:px-4 py-2 rounded-lg border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Export CSV
            </button>
            <Link
              href="/"
              className="group relative inline-flex items-center gap-2 text-sm md:text-lg font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-100/60 hover:bg-emerald-200/80 px-3 md:px-5 py-2 rounded-xl md:rounded-2xl backdrop-blur-xl border border-emerald-200/60 shadow-lg hover:shadow-glow-emerald-xl hover:-translate-y-1 hover:scale-105 transition-all duration-400 transform-3d"
            >
              Home
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
          </div>
        </header>

        {/* Holographic Tab Navigation */}
        <nav className="sticky top-[72px] md:top-[88px] z-30 backdrop-blur-3xl bg-white/95 border-b border-slate-200/60 px-4 md:px-10 py-3 md:py-4 flex gap-2 md:gap-3 overflow-x-auto shadow-glow-lg relative">
          <AmbientParticles color="rgba(255,255,255,0.05)" />
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`
                  relative overflow-hidden px-7 py-3.5 rounded-3xl text-base font-bold whitespace-nowrap transition-all duration-500 ease-out
                  backdrop-blur-xl shadow-lg hover:shadow-holo-lg transform-3d
                  ${isActive 
                    ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-400/10 to-teal-500/15 text-emerald-800 border-2 border-emerald-300/60 shadow-glow-emerald-xl shadow-emerald-500/25 ring-4 ring-emerald-400/30 scale-105 translate-y-1' 
                    : 'bg-white/80 border border-slate-200/50 text-slate-700 hover:bg-slate-50/90 hover:text-slate-900 hover:border-emerald-300/50 hover:shadow-glow-emerald-lg hover:scale-105 hover:translate-y-1 hover:rotate-x-5'
                  }
                `}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                style={{ animationDelay: `${idx * 80}ms` } as React.CSSProperties}
              >
                <div className="relative z-10">{tab.label}</div>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-transparent to-teal-400/20 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto relative">
          {loading || villagesLoading ? (
            <div className="h-[70vh] flex flex-col items-center justify-center text-slate-500 gap-8 relative">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-slate-200/50 border-t-emerald-500/80 rounded-3xl backdrop-blur-xl animate-spin-smooth shadow-2xl shadow-emerald-500/20" />
                <div className="absolute inset-0 w-24 h-24 border-2 border-emerald-400/30 rounded-3xl animate-ping-slow" />
              </div>
              <div className="text-2xl font-black bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent drop-shadow-lg">
                Loading village data...
              </div>
            </div>
          ) : !selected ? (
            <div className="h-[70vh] flex flex-col items-center justify-center text-slate-600 gap-8">
              <div className="text-5xl mb-8 animate-bounce">ðŸ˜ï¸</div>
              <h3 className="text-3xl font-black text-slate-800 drop-shadow-lg text-center">
                Select a village to explore carbon insights
              </h3>
              <HolographicVillageDropdown 
                villages={villages} 
                selected={null} 
                onSelect={setSelected} 
                loading={villagesLoading} 
              />
            </div>
          ) : (
            <>
              <VillageHeader v={selected} />

              {activeTab === 'overview' && (
                <div className="mt-6 space-y-6">
                  

                  <MonthlyActivity rows={dashData?.monthly} />

                </div>
              )}

              {activeTab === 'emissions' && <EmissionsChart rows={dashData?.emissions} />}
              {activeTab === 'budget' && <CarbonBudgetCard before={dashData?.budgetBefore} after={dashData?.budgetAfter} />}
              {activeTab === 'scenario' && <ScenarioProjection rows={dashData?.scenario} />}
              {activeTab === 'sequestration' && <SequestrationCard before={dashData?.seqBefore} after={dashData?.seqAfter} />}
              {activeTab === 'interventions' && <InterventionReductions rows={dashData?.reductions} />}
              {activeTab === 'activity' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                  <MonthlyActivity rows={dashData?.monthly} />
                  <EmissionFactors rows={dashData?.factors} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Ultra-realistic global styles */}
      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(100%) skewX(-12deg); }
        }
        @keyframes scan-slow {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes float-3d {
          0%, 100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
          33% { transform: translateY(-8px) rotateX(2deg) rotateY(-1deg); }
          66% { transform: translateY(-4px) rotateX(-1deg) rotateY(2deg); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes expand {
          from { width: 0; }
          to { width: 6rem; }
        }
        @keyframes spin-smooth {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .shadow-holo-sm { box-shadow: 0 10px 40px rgba(0,0,0,0.1), 0 0 20px rgba(16,185,129,0.1); }
        .shadow-holo-md { box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 30px rgba(16,185,129,0.2); }
        .shadow-holo-lg { box-shadow: 0 25px 80px rgba(0,0,0,0.2), 0 0 40px rgba(16,185,129,0.3); }
        .shadow-holo-xl { box-shadow: 0 35px 100px rgba(0,0,0,0.25), 0 0 60px rgba(16,185,129,0.4); }
        .shadow-holo-2xl { box-shadow: 0 50px 150px rgba(0,0,0,0.3), 0 0 80px rgba(16,185,129,0.5); }
        .shadow-glow { box-shadow: 0 0 12px rgb(57, 5, 82); }
        .shadow-glow-emerald { box-shadow: 0 0 20px rgba(16,185,129,0.3); }
        .shadow-glow-emerald-sm { box-shadow: 0 0 12px rgba(16,185,129,0.2); }
        .shadow-glow-emerald-lg { box-shadow: 0 0 30px rgba(16,185,129,0.4); }
        .shadow-glow-slate-md { box-shadow: 0 0 15px rgba(148,163,184,0.3); }
        .transform-3d { transform-style: preserve-3d; }
        .perspective-1000 { perspective: 1000px; }
        .rotate-x-5 { transform: rotateX(5deg); }
        .rotate-y-180 { transform: rotateY(180deg); }
        .animate-float-3d { animation: float-3d 8s ease-in-out infinite; }
        .animate-scan { animation: scan 3s linear infinite; }
        .animate-scan-slow { animation: scan-slow 4s linear infinite; }
        .animate-slide-down { animation: slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-expand { animation: expand 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-spin-smooth { animation: spin-smooth 2s linear infinite; }
        .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
