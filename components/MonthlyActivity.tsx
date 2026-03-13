'use client';
import { useEffect, useMemo, useState } from 'react';

export interface MonthlyRow {
  vlcode: string;
  village_name: string;
  activity: string;
  unit: string;
  monthly_quantity: string;
}

const ACTIVITY_COLORS: Record<string, string> = {
  'LPG Consumption': '#f97316',
  'Firewood Consumption': '#78716c',
  'Electricity Consumption': '#eab308',
  'Solid Waste': '#8b5cf6',
  'Petrol Consumption': '#ef4444',
  'Vehicles (2-wheelers)': '#3b82f6',
  Livestock: '#22c55e',
};

type ChartItem = {
  activity: string;
  unit: string;
  val: number;
  color: string;
};

function truncate(text: string, max = 22): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function MonthlyActivity({ rows }: { rows: MonthlyRow[] | null | undefined }) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const safeRows = rows || [];
  const items = useMemo<ChartItem[]>(() => {
    return safeRows
      .map((r) => ({
        activity: r.activity,
        unit: r.unit,
        val: parseFloat(r.monthly_quantity || '0') || 0,
        color: ACTIVITY_COLORS[r.activity] || '#9ca3af',
      }))
      .filter((i) => i.val > 0)
      .sort((a, b) => b.val - a.val);
  }, [safeRows]);

  if (!rows || rows.length === 0 || items.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 13 }}>No monthly data available</div>
        </div>
      </div>
    );
  }

  const max = Math.max(...items.map((i) => i.val), 1);
  const total = items.reduce((sum, i) => sum + i.val, 0);
  const top = items[0];
  const active = items.find((i) => i.activity === selected) || items.find((i) => i.activity === hovered) || top;
  const avg = total / items.length;

  // Annual projection
  const annualTotal = total * 12;

  // Unit groups
  const unitGroups: Record<string, { unit: string; total: number; count: number }> = {};
  items.forEach((item) => {
    if (!unitGroups[item.unit]) unitGroups[item.unit] = { unit: item.unit, total: 0, count: 0 };
    unitGroups[item.unit].total += item.val;
    unitGroups[item.unit].count += 1;
  });

  const shown = isNarrow ? items.slice(0, 6) : items.slice(0, 8);

  const LABEL = '#334155';

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Monthly Activity
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Consumption ranked by monthly quantity
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Total / Month', value: total.toLocaleString(), sub: 'all units' },
            { label: 'Annual Est.', value: annualTotal.toLocaleString(), sub: 'projected' },
            { label: 'Avg / Activity', value: avg.toFixed(1), sub: 'monthly' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '8px 12px',
              minWidth: 90,
            }}>
              <div style={{ fontSize: 10, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: 10, color: LABEL, marginTop: 1 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive vertical columns */}
      <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, background: 'rgba(255,255,255,0.01)', marginBottom: 16, padding: '14px 10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 230, overflowX: 'auto', padding: '6px 4px 0' }}>
          {shown.map((item) => {
            const pct = (item.val / total) * 100;
            const h = Math.max((item.val / max) * 170, 14);
            const isActive = active.activity === item.activity;
            return (
              <button
                key={item.activity}
                onClick={() => setSelected((prev) => (prev === item.activity ? null : item.activity))}
                onMouseEnter={() => setHovered(item.activity)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  minWidth: isNarrow ? 86 : 98,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 10, color: isActive ? item.color : LABEL, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {pct.toFixed(0)}%
                </div>
                <div style={{ width: '100%', height: 180, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '72%',
                      height: h,
                      borderRadius: 6,
                      background: `linear-gradient(180deg, ${item.color}, ${item.color}bb)`,
                      boxShadow: isActive ? `0 0 0 2px ${item.color}55` : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: isActive ? item.color : LABEL, fontWeight: isActive ? 700 : 500, textAlign: 'center', lineHeight: 1.2 }}>
                  {truncate(item.activity, 14)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Top activity spotlight + unit breakdown side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: 12 }}>

        {/* Top activity spotlight */}
        <div style={{
          padding: '12px 14px',
          borderRadius: 12,
          border: `1px solid ${active.color}33`,
          background: `${active.color}0d`,
        }}>
          <div style={{ fontSize: 10, color: LABEL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Highest Activity
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: active.color, fontFamily: 'Syne, sans-serif', marginBottom: 6 }}>
            {active.activity}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: LABEL, marginBottom: 1 }}>Monthly</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: active.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {active.val.toLocaleString()}
                <span style={{ fontSize: 11, marginLeft: 4, fontWeight: 500 }}>{active.unit}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: LABEL, marginBottom: 1 }}>Share</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: active.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {((active.val / total) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: LABEL, marginBottom: 1 }}>Annual</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: active.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {(active.val * 12).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
