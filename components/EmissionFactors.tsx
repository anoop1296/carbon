// EmissionFactors.tsx
'use client';

export interface FactorRow { category: string; emission_factor: string; source: string; }

const ICONS: Record<string, string> = { LPG: '??', Firewood: '??', Electricity: '?', 'Petrol/Diesel': '?', Waste: '???', Rice: '??', Wheat: '??' };
const SRC: Record<string, { bg: string; color: string }> = {
  'IPCC 2006': { bg: '#eff6ff', color: '#1d4ed8' },
  'CEA India': { bg: '#fff7ed', color: '#c2410c' },
  'CPCB': { bg: '#faf5ff', color: '#7c3aed' },
  'EX-ACT': { bg: '#f0fdf4', color: '#15803d' },
};

export default function EmissionFactors({ rows }: { rows: FactorRow[] | null | undefined }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>??</div>
          <div style={{ fontSize: 13 }}>No emission factors</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Emission Factors</h3>
        <p style={{ fontSize: 12, color: '#05193a', margin: '3px 0 0' }}>Reference values used in calculations</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r, i) => {
          const ss = SRC[r.source] || { bg: '#f9fafb', color: '#374151' };
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 10px', borderRadius: 8, background: i % 2 === 0 ? '#fafafa' : 'white' }}>
              <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{ICONS[r.category] || '�'}</span>
              <span style={{ fontSize: 13, color: '#0c244b', flex: 1, minWidth: 110, fontWeight: 500 }}>{r.category}</span>
              <span style={{ fontSize: 11, color: '#03240f', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{r.emission_factor}</span>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: ss.bg, color: ss.color, fontWeight: 600, flexShrink: 0 }}>{r.source}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
