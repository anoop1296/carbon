'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export interface ScenarioRow {
  vlcode: string;
  village_name: string;
  year: string;
  business_as_usual: string;
  line_of_sight: string;
  accelerated: string;
}
const LABEL_DARK = '#6b0f1a';

function toNum(v: string): number {
  const n = parseFloat(v || '0');
  return Number.isFinite(n) ? n : 0;
}

export default function ScenarioProjection({ rows }: { rows: ScenarioRow[] | null | undefined }) {
  const [isNarrow, setIsNarrow] = useState(false);
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
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No scenario data available</div>
        </div>
      </div>
    );
  }

  const years = rows.map((r) => r.year);
  const bau = rows.map((r) => toNum(r.business_as_usual) / 1000);
  const los = rows.map((r) => toNum(r.line_of_sight) / 1000);
  const acc = rows.map((r) => toNum(r.accelerated) / 1000);

  const data = [
    {
      x: years,
      y: bau,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Business as Usual',
      line: { color: '#ff4d4d', width: 3 },
      marker: { size: 7, color: '#ff4d4d' },
      hovertemplate: 'Year: %{x}<br>BAU: %{y:.2f} t<extra></extra>',
    },
    {
      x: years,
      y: los,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Line of Sight',
      line: { color: '#ffb84d', width: 3, dash: 'dash' },
      marker: { size: 7, color: '#ffb84d' },
      hovertemplate: 'Year: %{x}<br>LoS: %{y:.2f} t<extra></extra>',
    },
    {
      x: years,
      y: acc,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Accelerated',
      line: { color: '#00e676', width: 3, dash: 'dot' },
      marker: { size: 7, color: '#00e676' },
      hovertemplate: 'Year: %{x}<br>ACC: %{y:.2f} t<extra></extra>',
    },
  ];

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(255,255,255,0.02)',
    margin: { l: isNarrow ? 44 : 68, r: isNarrow ? 12 : 24, t: 20, b: isNarrow ? 48 : 58 },
    hovermode: 'x unified',
    legend: {
      orientation: 'h',
      x: 0,
      y: isNarrow ? 1.22 : 1.16,
      font: { color: LABEL_DARK, size: isNarrow ? 10 : 12 },
    },
    xaxis: {
      title: { text: 'Year', font: { color: LABEL_DARK, size: isNarrow ? 11 : 13 } },
      tickfont: { color: LABEL_DARK, size: isNarrow ? 10 : 12 },
      gridcolor: 'rgba(255,255,255,0.08)',
      zeroline: false,
      linecolor: 'rgba(255,255,255,0.2)',
    },
    yaxis: {
      title: { text: 'CO2e (tons/year)', font: { color: LABEL_DARK, size: isNarrow ? 11 : 13 } },
      tickfont: { color: LABEL_DARK, size: isNarrow ? 10 : 12 },
      gridcolor: 'rgba(255,255,255,0.08)',
      zeroline: false,
      linecolor: 'rgba(255,255,255,0.2)',
    },
    font: { color: '#dce6f2', family: 'Space Grotesk, sans-serif' },
    autosize: true,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
  };

  return (
    <div className="card fade-up">
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'Syne, sans-serif' }}>
          Scenario Projection
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: '0.03em' }}>
          Simple line graph with X-axis, Y-axis and Plotly toolbar
        </p>
      </div>

      <div
        style={{
          width: '100%',
          minHeight: isNarrow ? 320 : 380,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 6,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
        }}
      >
        <Plot
          data={data as never[]}
          layout={layout as never}
          config={config as never}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
