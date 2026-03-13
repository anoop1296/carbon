'use client';
import { useEffect, useState, useRef } from 'react';

export interface EmissionRow {
  vlcode: string;
  village_name: string;
  sector: string;
  activity: string;
  annual_co2_kg: string;
}

const SECTOR_COLORS: Record<string, string> = {
  Residential: '#ff7b4d',
  Energy: '#ffd24d',
  Transport: '#4d9fff',
  Agriculture: '#00e676',
  Waste: '#b084ff',
  Livestock: '#ff6eb4',
};

const LABEL_COLOR = '#334155';

type HoverTip = {
  x: number;
  y: number;
  activity: string;
  sector: string;
  valueTons: number;
  pct: number;
};

type SortMode = 'value' | 'sector' | 'alpha';

export default function EmissionsChart({ rows }: { rows: EmissionRow[] | null | undefined }) {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<HoverTip | null>(null);
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('value');
  const [topN, setTopN] = useState(6);
  const [isNarrow, setIsNarrow] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!rows || rows.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>No emissions data available</div>
        </div>
      </div>
    );
  }

  // --- Aggregate by activity from API data only ---
  const activityMap = new Map<string, { value: number; sector: string }>();

  rows.forEach((r) => {
    const v = parseFloat(r.annual_co2_kg || '0') || 0;
    if (v <= 0) return;
    const prev = activityMap.get(r.activity);
    activityMap.set(r.activity, {
      value: (prev?.value || 0) + v,
      sector: r.sector,
    });
  });

  const allActivities = Array.from(activityMap.entries()).map(([label, data]) => ({
    key: label,
    label,
    sector: data.sector,
    value: data.value,
  }));

  // Sector totals for stacked bar + legend
  const sectorMap = new Map<string, number>();
  allActivities.forEach((a) => {
    sectorMap.set(a.sector, (sectorMap.get(a.sector) || 0) + a.value);
  });
  const sectorTotals = Array.from(sectorMap.entries())
    .map(([sector, value]) => ({ sector, value }))
    .sort((a, b) => b.value - a.value);

  const total = sectorTotals.reduce((s, x) => s + x.value, 0);

  // Sort & filter
  let sorted = [...allActivities];
  if (sortMode === 'value') sorted.sort((a, b) => b.value - a.value);
  else if (sortMode === 'sector') sorted.sort((a, b) => a.sector.localeCompare(b.sector) || b.value - a.value);
  else sorted.sort((a, b) => a.label.localeCompare(b.label));

  // Filter by active sector if set
  const filtered = activeSector ? sorted.filter((a) => a.sector === activeSector) : sorted;
  const activities = filtered.slice(0, topN);

  const maxY = Math.max(1, ...activities.map((a) => a.value));

  // Y-axis ticks
  const rawStep = maxY / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const yTicks = [0, 1, 2, 3, 4].map((i) => i * niceStep);
  const yMax = yTicks[4];

  const shortLabel = (text: string, limit = isNarrow ? 8 : 11) =>
    text.length > limit ? `${text.slice(0, limit)}…` : text;

  const showTip = (e: React.MouseEvent, a: { label: string; sector: string; value: number }) => {
    setActiveBar(a.label);
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      activity: a.label,
      sector: a.sector,
      valueTons: a.value / 1000,
      pct: total > 0 ? (a.value / total) * 100 : 0,
    });
  };
  const moveTip = (e: React.MouseEvent) =>
    setTooltip((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : null));
  const hideTip = () => {
    setActiveBar(null);
    setTooltip(null);
  };

  if (total <= 0) return null;

  const chartH = isNarrow ? 220 : 250;
  const padB = isNarrow ? 40 : 44;
  const padL = isNarrow ? 42 : 50;

  return (
    <div className="card fade-up" style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Annual Emissions
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.03em' }}>
            CO₂e by activity · from API data
          </p>
        </div>
        <div style={{
          background: 'rgba(255,77,77,0.08)',
          border: '1px solid rgba(255,77,77,0.18)',
          borderRadius: 12,
          padding: '8px 14px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, color: '#ff4d4d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total / year</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ff6b6b', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
            {(total / 1000).toFixed(1)}t
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>CO₂e</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Sort buttons */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['value', 'sector', 'alpha'] as SortMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setSortMode(m)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: sortMode === m ? 'rgba(77,159,255,0.18)' : 'transparent',
                color: sortMode === m ? '#4d9fff' : LABEL_COLOR,
                transition: 'all 0.18s',
                letterSpacing: '0.04em',
                textTransform: 'capitalize',
              }}
            >
              {m === 'value' ? '↓ Value' : m === 'sector' ? '⊞ Sector' : 'A–Z'}
            </button>
          ))}
        </div>

        {/* Top-N selector */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
          {[6, 10, 'All'].map((n) => {
            const val = n === 'All' ? allActivities.length : (n as number);
            return (
              <button
                key={n}
                onClick={() => setTopN(val)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: topN === val ? 'rgba(0,230,118,0.15)' : 'transparent',
                  color: topN === val ? '#640404' : LABEL_COLOR,
                  transition: 'all 0.18s',
                }}
              >
                {n === 'All' ? 'All' : `Top ${n}`}
              </button>
            );
          })}
        </div>

        {activeSector && (
          <button
            onClick={() => setActiveSector(null)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(168, 19, 19, 0.94)',
              cursor: 'pointer',
              background: 'rgba(255,107,107,0.08)',
              color: '#ff6b6b',
            }}
          >
            ✕ {activeSector}
          </button>
        )}
      </div>

      {/* Chart area */}
      <div
        ref={chartRef}
        style={{
          position: 'relative',
          height: chartH,
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 14,
          padding: `10px 12px ${padB}px ${padL}px`,
          overflow: 'hidden',
        }}
      >
        {/* Y grid + labels */}
        {yTicks.map((tick) => {
          const pct = yMax > 0 ? (tick / yMax) * 100 : 0;
          const bottomPx = padB + (pct / 100) * (chartH - padB - 10);
          return (
            <div key={tick}>
              <div style={{
                position: 'absolute',
                left: padL,
                right: 12,
                bottom: bottomPx,
                borderTop: tick === 0 ? '1px solid rgba(139, 13, 13, 0.94)' : '1px dashed rgba(255,255,255,0.06)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                left: 4,
                bottom: bottomPx - 7,
                fontSize: 10,
                color: LABEL_COLOR,
                fontFamily: 'JetBrains Mono, monospace',
                pointerEvents: 'none',
                lineHeight: 1,
              }}>
                {(tick / 1000).toFixed(tick >= 1000 ? 1 : 0)}{tick >= 1000 ? 't' : 'kg'}
              </div>
            </div>
          );
        })}

        {/* Bars */}
        <div style={{
          position: 'absolute',
          left: padL,
          right: 50,
          bottom: padB,
          top: 10,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          gap: isNarrow ? 4 : 6,
        }}>
          {activities.map((a) => {
            const heightPct = yMax > 0 ? (a.value / yMax) * 100 : 0;
            const color = SECTOR_COLORS[a.sector] || '#8b9ab0';
            const isActive = activeBar === a.key;
            const isDimmed = activeBar !== null && !isActive;

            return (
              <div
                key={a.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                  flex: 1,
                  minWidth: 0,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => showTip(e, a)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              >
                {/* Value label on hover */}
                <div style={{
                  fontSize: 10,
                  color: color,
                  fontFamily: 'TT Hoves, sans-serif',
                  fontWeight: 700,
                  marginBottom: 3,
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.15s',
                  whiteSpace: 'nowrap',
                }}>
                  {(a.value / 1000).toFixed(2)}t
                </div>

                {/* Bar */}
                <div
                  style={{
                    width: '72%',
                    maxWidth: isNarrow ? 26 : 36,
                    height: mounted ? `${Math.max(heightPct, 1.5)}%` : '0%',
                    background: isActive
                      ? color
                      : `${color}${isDimmed ? '64' : 'bb'}`,
                    borderRadius: '5px 5px 0 0',
                    transition: 'height 0.95s cubic-bezier(0.4,0,0.2,1), background 0.15s, box-shadow 0s',
                    boxShadow: isActive ? `0 0 14px ${color}88` : 'none',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                />

                {/* X label */}
                <div style={{
                  marginTop: 6,
                  fontSize: isNarrow ? 12 : 11,
                  color: isActive ? color : LABEL_COLOR,
                  fontWeight: isActive ? 900 : 500,
                  textAlign: 'center',
                  lineHeight: 1.15,
                  transition: 'color 0.15s',
                  width: '100%',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}>
                  {shortLabel(a.label)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector legend + share bar — clickable to filter */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 11, color: LABEL_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          Sector Share · click to filter
        </div>

        {/* Stacked bar */}
        <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', marginBottom: 10, cursor: 'pointer' }}>
          {sectorTotals.map((s) => (
            <div
              key={s.sector}
              title={`${s.sector}: ${((s.value / total) * 100).toFixed(1)}%`}
              onClick={() => setActiveSector(activeSector === s.sector ? null : s.sector)}
              style={{
                width: `${(s.value / total) * 100}%`,
                background: SECTOR_COLORS[s.sector] || '#040c18',
                opacity: activeSector && activeSector !== s.sector ? 0.25 : 1,
                transition: 'opacity 0.2s, width 0.8s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Legend pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sectorTotals.map((s) => {
            const isSelected = activeSector === s.sector;
            const color = SECTOR_COLORS[s.sector] || '#8b9ab0';
            return (
              <button
                key={s.sector}
                onClick={() => setActiveSector(isSelected ? null : s.sector)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 9px',
                  borderRadius: 99,
                  border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}`,
                  background: isSelected ? `${color}22` : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  opacity: activeSector && !isSelected ? 0.45 : 1,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: isSelected ? color : LABEL_COLOR, fontWeight: 600 }}>{s.sector}</span>
                <span style={{ fontSize: 10, color: isSelected ? color : '#102e58', fontFamily: 'JetBrains Mono, monospace' }}>
                  {((s.value / total) * 100).toFixed(0)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y - 72,
            background: 'rgba(10,14,20,0.96)',
            border: `1px solid ${SECTOR_COLORS[tooltip.sector] || '#8b9ab0'}44`,
            borderRadius: 10,
            padding: '10px 13px',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
            minWidth: 160,
          }}
        >
          <div style={{ fontSize: 15, color: '#f0f6ff', fontWeight: 700, marginBottom: 3 }}>{tooltip.activity}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: SECTOR_COLORS[tooltip.sector] || '#8b9ab0',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{tooltip.sector}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15  , color: 'rgb(78, 2, 2)', marginBottom: 1 }}>Emission</div>
              <div style={{ fontSize: 14, color: '#032a3d', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                {tooltip.valueTons.toFixed(3)}t CO₂e
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, color: 'rgba(100, 9, 9, 0.91)', marginBottom: 1 }}>Share</div>
              <div style={{ fontSize: 14, color: '#085e34', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                {tooltip.pct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}