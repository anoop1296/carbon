'use client';

import { useState, useEffect } from 'react';

// ────────────────────────────────────────────────
// Shared / Common Types
// ────────────────────────────────────────────────

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

export interface MonthlyRow {
  vlcode: string;
  village_name: string;
  activity: string;
  unit: string;
  monthly_quantity: string;
}

export interface FactorRow {
  category: string;
  emission_factor: string;
  source: string;
}

// ────────────────────────────────────────────────
// SequestrationCard
// ────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  Forestry:      { bg: 'rgba(0,230,118,0.06)',  border: 'rgba(0,230,118,0.18)',  color: '#00e676', icon: 'FR' },
  Agroforestry:  { bg: 'rgba(255,184,77,0.06)', border: 'rgba(255,184,77,0.18)', color: '#ffb84d', icon: 'AF' },
  'Soil Carbon': { bg: 'rgba(193,139,74,0.06)', border: 'rgba(193,139,74,0.18)', color: '#d4a04d', icon: 'SC' },
  'Green Belt':  { bg: 'rgba(0,212,255,0.06)',  border: 'rgba(0,212,255,0.18)',  color: '#00d4ff', icon: 'GB' },
};

export function SequestrationCard({
  before,
  after,
}: {
  before: SeqBeforeRow[] | null | undefined;
  after: SeqAfterRow[] | null | undefined;
}) {
  const [mounted, setMounted] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const beforeRows = before || [];
  const afterRows = (after || []).filter((r) => r.type);

  const existingTotalKg = beforeRows.reduce((s, r) => s + (parseFloat(r.annual_co2_sequestered_kg || '0') || 0), 0);
  const addedTotalKg   = afterRows.reduce((s, r) => s + (parseFloat(r.annual_co2_sequestration_kg || '0') || 0), 0);
  const addedArea      = afterRows.reduce((s, r) => s + (parseFloat(r.area_added_ha || '0') || 0), 0);
  const topAdded       = afterRows.reduce((m, r) => Math.max(m, parseFloat(r.annual_co2_sequestration_kg || '0') || 0), 0);

  const noData = (title: string) => (
    <div style={{
      textAlign: 'center',
      color: '#94a3b8',
      padding: '40px 0',
      border: '1px dashed rgba(148,163,184,0.3)',
      borderRadius: 14,
      background: 'rgba(241,245,249,0.4)',
    }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 14 }}>No data available</div>
    </div>
  );

  return (
    <div className="card" style={{ height: '100%', background: 'white', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Sequestration</h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>
          Existing sink vs added interventions
        </p>
      </div>

      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isNarrow ? 260 : 300}px, 1fr))`, gap: 20 }}>
        {/* Existing Sequestration */}
        <div style={{
          borderRadius: 14,
          padding: 16,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02))',
          border: '1px solid rgba(251,191,36,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Existing Sequestration
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#d97706', fontFamily: 'monospace' }}>
              {(existingTotalKg / 1000).toFixed(1)} t
            </div>
          </div>

          {beforeRows.length === 0 ? noData('Existing') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {beforeRows.map((r, i) => {
                const kg = parseFloat(r.annual_co2_sequestered_kg || '0') || 0;
                const pct = existingTotalKg > 0 ? (kg / existingTotalKg) * 100 : 0;
                const key = `exist-${r.source || 'unk'}-${i}`;
                const isHovered = hoverKey === key;

                return (
                  <div
                    key={key}
                    onMouseEnter={() => setHoverKey(key)}
                    onMouseLeave={() => setHoverKey(null)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: isHovered ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.04)',
                      border: `1px solid ${isHovered ? '#fbbf24' : 'rgba(251,191,36,0.18)'}`,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{r.source || 'Unknown'}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>
                        {(kg / 1000).toFixed(2)} t
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      <span>{Number(r.area_ha || 0).toFixed(1)} ha</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(226,232,240,0.6)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: mounted ? `${Math.max(pct, 3)}%` : '0%',
                          height: '100%',
                          background: 'linear-gradient(90deg, #fbbf24, #d97706)',
                          transition: 'width 1s ease-out',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Added Interventions */}
        <div style={{
          borderRadius: 14,
          padding: 16,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))',
          border: '1px solid rgba(34,197,94,0.22)',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Added Interventions
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Area added: {addedArea.toFixed(1)} ha
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace' }}>
                {(addedTotalKg / 1000).toFixed(1)} t
              </div>
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.03em' }}>CO₂e / year</div>
            </div>
          </div>

          {afterRows.length === 0 ? noData('Added') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {afterRows.map((r, i) => {
                const val = parseFloat(r.annual_co2_sequestration_kg || '0') || 0;
                const st = TYPE_COLORS[r.type] || { bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.2)', color: '#64748b', icon: '–' };
                const pct = addedTotalKg > 0 ? (val / addedTotalKg) * 100 : 0;
                const rel = topAdded > 0 ? (val / topAdded) * 100 : 0;
                const key = `add-${r.intervention || 'unk'}-${i}`;
                const isHovered = hoverKey === key;

                return (
                  <div
                    key={key}
                    onMouseEnter={() => setHoverKey(key)}
                    onMouseLeave={() => setHoverKey(null)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: isHovered ? `${st.color}15` : st.bg,
                      border: `1px solid ${isHovered ? st.color + '60' : st.border}`,
                      transition: 'all 0.18s ease',
                      boxShadow: isHovered ? `0 4px 16px ${st.color}20` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: `${st.color}20`,
                          border: `1px solid ${st.color}50`,
                          color: st.color,
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {st.icon}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{r.intervention}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: st.color, fontFamily: 'monospace' }}>
                        {(val / 1000).toFixed(2)} t
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      <span>{Number(r.area_added_ha || 0).toFixed(1)} ha</span>
                      <span>{Number(r.sequestration_factor || 0).toFixed(0)} kg/ha/yr</span>
                    </div>

                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(226,232,240,0.5)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{
                        width: mounted ? `${Math.max(rel, 4)}%` : '0%',
                        height: '100%',
                        background: `linear-gradient(90deg, ${st.color}aa, ${st.color})`,
                        transition: 'width 1s ease-out',
                      }} />
                    </div>

                    <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>
                      {pct.toFixed(1)}% of added total
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// MonthlyActivity
// ────────────────────────────────────────────────

const ACTIVITY_STYLE: Record<string, { color: string; bg: string; badge: string }> = {
  'LPG Consumption':         { color: '#f97316', bg: 'rgba(249,115,22,0.08)',   badge: 'LPG' },
  'Firewood Consumption':    { color: '#78716c', bg: 'rgba(120,113,108,0.08)',  badge: 'FW'  },
  'Electricity Consumption': { color: '#eab308', bg: 'rgba(234,179,8,0.08)',    badge: 'ELC' },
  'Solid Waste':             { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',   badge: 'SW'  },
  'Petrol Consumption':      { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    badge: 'PTR' },
  'Vehicles (2-wheelers)':   { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',   badge: '2W'  },
  'Livestock':               { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',    badge: 'LS'  },
};

export function MonthlyActivity({ rows }: { rows: MonthlyRow[] | null | undefined }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 180);
  }, []);

  if (!rows || rows.length === 0) {
    return (
      <div style={{
        minHeight: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: 15,
        background: 'white',
        borderRadius: 16,
      }}>
        No monthly activity data available
      </div>
    );
  }

  const items = rows
    .map(r => ({ ...r, val: parseFloat(r.monthly_quantity || '0') || 0 }))
    .filter(i => i.val > 0)
    .sort((a, b) => b.val - a.val);

  const max   = Math.max(...items.map(i => i.val), 1);
  const total = items.reduce((s, i) => s + i.val, 0);

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Monthly Activity</h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>
          Resource consumption – ranked by quantity
        </p>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => {
          const st = ACTIVITY_STYLE[item.activity] || { color: '#6b7280', bg: 'rgba(107,114,128,0.06)', badge: '–' };
          const pct = total > 0 ? (item.val / total) * 100 : 0;

          return (
            <div
              key={i}
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                background: st.bg,
                border: '1px solid rgba(226,232,240,0.5)',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32,
                    height: 24,
                    borderRadius: 6,
                    background: `${st.color}15`,
                    border: `1px solid ${st.color}40`,
                    color: st.color,
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {st.badge}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{item.activity}</div>
                </div>

                <div style={{ fontSize: 16, fontWeight: 800, color: st.color, fontFamily: 'monospace' }}>
                  {item.val.toLocaleString()} {item.unit}
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div style={{ height: 6, borderRadius: 3, background: 'rgba(226,232,240,0.6)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: mounted ? `${(item.val / max) * 100}%` : '0%',
                    height: '100%',
                    background: `linear-gradient(90deg, ${st.color}aa, ${st.color})`,
                    transition: `width ${0.7 + i * 0.1}s ease-out`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// EmissionFactors
// ────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  LPG:             { label: 'LPG',  color: '#f97316' },
  Firewood:        { label: 'FW',   color: '#78716c' },
  Electricity:     { label: 'ELC',  color: '#eab308' },
  'Petrol/Diesel': { label: 'PTR',  color: '#ef4444' },
  Waste:           { label: 'WST',  color: '#8b5cf6' },
  Rice:            { label: 'RCE',  color: '#22c55e' },
  Wheat:           { label: 'WHT',  color: '#3b82f6' },
};

const SRC: Record<string, { bg: string; color: string }> = {
  'IPCC 2006': { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  'CEA India': { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
  'CPCB':      { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6' },
  'EX-ACT':    { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
};

export function EmissionFactors({ rows }: { rows: FactorRow[] | null | undefined }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: 15,
        background: 'white',
        borderRadius: 16,
      }}>
        No emission factors available
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Emission Factors</h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>
          Reference values used in calculations
        </p>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r, i) => {
          const cb = CATEGORY_BADGE[r.category] || { label: r.category.slice(0,3).toUpperCase(), color: '#6b7280' };
          const ss = SRC[r.source] || { bg: 'rgba(148,163,184,0.1)', color: '#64748b' };

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 10,
                background: i % 2 === 0 ? 'rgba(241,245,249,0.6)' : 'transparent',
                transition: 'background 0.18s',
              }}
            >
              <div style={{
                width: 36,
                height: 24,
                borderRadius: 6,
                background: `${cb.color}15`,
                border: `1px solid ${cb.color}40`,
                color: cb.color,
                fontSize: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {cb.label}
              </div>

              <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                {r.category}
              </div>

              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#16a34a',
                fontFamily: 'monospace',
                minWidth: 100,
                textAlign: 'right',
              }}>
                {r.emission_factor}
              </div>

              <div style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: ss.bg,
                color: ss.color,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}>
                {r.source}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}