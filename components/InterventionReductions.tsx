'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export interface ReductionRow {
  vlcode: string;
  village_name: string;
  sector: string;
  intervention: string;
  activity_reduction: string;
  emission_factor: string;
  annual_co2_reduction_kg: string;
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

function toNum(v: string): number {
  const n = parseFloat(v || '0');
  return Number.isFinite(n) ? n : 0;
}

function shortLabel(text: string, limit = 18): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

export default function InterventionReductions({ rows }: { rows: ReductionRow[] | null | undefined }) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [activeBar, setActiveBar] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!rows || rows.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 14 }}>No intervention data available</div>
        </div>
      </div>
    );
  }

  const items = rows.filter((r) => r.sector || r.intervention);
  if (items.length === 0) return null;

  const totalTons = items.reduce((sum, r) => sum + toNum(r.annual_co2_reduction_kg) / 1000, 0);

  // Unique sectors
  const sectors = Array.from(new Set(items.map((r) => r.sector))).filter(Boolean);

  const filtered = selectedSector ? items.filter((r) => r.sector === selectedSector) : items;

  // Bar chart data — only annual CO2 reduction
  const labels = filtered.map((r) => shortLabel(r.intervention || 'Unknown', isNarrow ? 12 : 18));
  const annualTons = filtered.map((r) => toNum(r.annual_co2_reduction_kg) / 1000);
  const barColors = filtered.map((r) => {
    const c = SECTOR_COLORS[r.sector] || '#8b9ab0';
    return `${c}cc`;
  });
  const barBorderColors = filtered.map((r) => SECTOR_COLORS[r.sector] || '#8b9ab0');

  const data = [
    {
      x: labels,
      y: annualTons,
      type: 'bar',
      name: 'Annual CO₂ Reduction',
      marker: {
        color: barColors,
        line: { color: barBorderColors, width: 1.5 },
      },
      hovertemplate: '<b>%{x}</b><br>CO₂ Reduction: <b>%{y:.3f} t/yr</b><extra></extra>',
    },
  ];

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(255,255,255,0.015)',
    margin: { l: isNarrow ? 48 : 62, r: 16, t: 16, b: isNarrow ? 90 : 100 },
    bargap: 0.32,
    hovermode: 'closest',
    showlegend: false,
    xaxis: {
      tickangle: -30,
      automargin: true,
      tickfont: { color: LABEL_COLOR, size: isNarrow ? 9 : 11, family: 'JetBrains Mono, monospace' },
      gridcolor: 'rgba(255,255,255,0.04)',
      linecolor: 'rgba(255,255,255,0.12)',
      tickcolor: 'rgba(255,255,255,0.1)',
    },
    yaxis: {
      title: { text: 'CO₂ Reduction (t/yr)', font: { color: LABEL_COLOR, size: isNarrow ? 10 : 12 } },
      tickfont: { color: LABEL_COLOR, size: isNarrow ? 9 : 11, family: 'JetBrains Mono, monospace' },
      gridcolor: 'rgba(255,255,255,0.07)',
      zeroline: true,
      zerolinecolor: 'rgba(255,255,255,0.15)',
      linecolor: 'rgba(255,255,255,0.12)',
    },
    font: { color: '#dce6f2', family: 'Syne, sans-serif' },
    autosize: true,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toImage'],
  };

  return (
    <div className="card fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Intervention Reductions
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.03em' }}>
            Annual CO₂ savings per intervention
          </p>
        </div>
        <div style={{
          background: 'rgba(0,230,118,0.08)',
          border: '1px solid rgba(0,230,118,0.2)',
          borderRadius: 12,
          padding: '8px 14px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, color: '#00e676', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Saved</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#00e676', fontFamily: 'Syne, sans-serif', lineHeight: 1.1 }}>
            {totalTons.toFixed(1)}t
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CO₂e / yr</div>
        </div>
      </div>

      {/* Sector filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => setSelectedSector(null)}
          style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
            border: `1px solid ${!selectedSector ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
            background: !selectedSector ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: !selectedSector ? '#f0f6ff' : LABEL_COLOR,
            cursor: 'pointer', transition: 'all 0.18s',
          }}
        >
          All
        </button>
        {sectors.map((s) => {
          const color = SECTOR_COLORS[s] || '#8b9ab0';
          const isActive = selectedSector === s;
          return (
            <button
              key={s}
              onClick={() => setSelectedSector(isActive ? null : s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
                background: isActive ? `${color}22` : 'transparent',
                color: isActive ? color : LABEL_COLOR,
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              {s}
            </button>
          );
        })}
      </div>

      {/* Bar chart — only annual CO2 reduction */}
      <div style={{
        width: '100%',
        minHeight: isNarrow ? 300 : 360,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.07)',
        padding: 6,
        background: 'rgba(255,255,255,0.01)',
        marginBottom: 20,
      }}>
        <Plot
          data={data as never[]}
          layout={layout as never}
          config={config as never}
          style={{ width: '100%', height: '100%', minHeight: isNarrow ? 290 : 350 }}
          useResizeHandler
        />
      </div>

      {/* Intervention detail cards — activity reduction + emission factor */}
      <div>
        <div style={{ fontSize: 11, color: LABEL_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Intervention Details
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((r, i) => {
            const color = SECTOR_COLORS[r.sector] || '#8b9ab0';
            const tons = toNum(r.annual_co2_reduction_kg) / 1000;
            const actRed = toNum(r.activity_reduction);
            const ef = toNum(r.emission_factor);
            return (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isNarrow ? '1fr' : '1fr auto auto auto',
                  alignItems: 'center',
                  gap: isNarrow ? 6 : 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid rgba(255,255,255,0.05)`,
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
                  transition: 'background 0.15s',
                }}
              >
                {/* Name + sector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 3, height: 32, borderRadius: 99, background: color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.intervention || '—'}
                    </div>
                    <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 1 }}>{r.sector}</div>
                  </div>
                </div>

                {/* Annual CO2 */}
                <div style={{ textAlign: isNarrow ? 'left' : 'center', paddingLeft: isNarrow ? 11 : 0 }}>
                  <div style={{ fontSize: 10, color: LABEL_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CO₂ Saved</div>
                  <div style={{ fontSize: 14, color: '#00e676', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {tons.toFixed(3)}t
                  </div>
                </div>

                {/* Activity reduction */}
                <div style={{ textAlign: isNarrow ? 'left' : 'center', paddingLeft: isNarrow ? 11 : 0 }}>
                  <div style={{ fontSize: 10, color: LABEL_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity Δ</div>
                  <div style={{ fontSize: 14, color: '#4d9fff', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {actRed.toFixed(2)}
                  </div>
                </div>

                {/* Emission factor
                <div style={{ textAlign: isNarrow ? 'left' : 'center', paddingLeft: isNarrow ? 11 : 0 }}>
                  <div style={{ fontSize: 10, color: LABEL_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>EF</div>
                  <div style={{ fontSize: 14, color: '#ffd24d', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {ef.toFixed(4)}
                  </div>
                </div> */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}