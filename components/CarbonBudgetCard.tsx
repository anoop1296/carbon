'use client';
import { useState, useEffect, useId } from 'react';

export interface BudgetRow {
  vlcode: string;
  village_name: string;
  parameter: string;
  value: string;
  unit?: string;
}

const FONT = "'Times New Roman', Times, Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";

function getVal(rows: BudgetRow[] | null | undefined = [], param: string): number {
  return parseFloat(rows?.find(r => r.parameter?.toLowerCase().includes(param.toLowerCase()))?.value || '0') || 0;
}

interface Slice { label: string; value: number; color: string; dark: string; }

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const os = polarXY(cx, cy, outerR, startDeg);
  const oe = polarXY(cx, cy, outerR, endDeg);
  const is_ = polarXY(cx, cy, innerR, endDeg);
  const ie = polarXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${is_.x} ${is_.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ie.x} ${ie.y}`,
    'Z'
  ].join(' ');
}

function DonutChart({
  slices,
  size = 220,
  title,
  centerUnit = 't',
}: {
  slices: Slice[];
  size?: number;
  title: string;
  centerUnit?: string;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const [anim, setAnim] = useState(0);
  const chartId = useId().replace(/:/g, '');

  useEffect(() => {
    const t = setTimeout(() => {
      let s: number | null = null;
      const tick = (ts: number) => {
        if (!s) s = ts;
        const p = Math.min((ts - s) / 900, 1);
        setAnim(p); // eased in-out
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 100);
    return () => clearTimeout(t);
  }, [slices]);

  const total = slices.reduce((sum, sl) => sum + sl.value, 0);
  if (total <= 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        No Data
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 14;
  const innerR = outerR * 0.62;
  const GAP = slices.length > 1 ? 1.8 : 0;

  let angle = 0;
  const built = slices.map((sl, i) => {
    const span = (sl.value / total) * 360 * anim;
    const start = angle + GAP / 2;
    const end = angle + span - GAP / 2;
    angle += span;
    const mid = (start + end) / 2;
    const push = polarXY(cx, cy, hov === i ? 8 : 0, mid);
    return { sl, i, start, end, mid, push };
  });

  return (
    <div style={{ position: 'relative', width: size, height: size + 20, flexShrink: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', textAlign: 'center', marginBottom: 6, fontFamily: FONT }}>
        {title}
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          {slices.map((sl, i) => (
            <radialGradient key={i} id={`${chartId}-g${i}`} cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor={sl.color} stopOpacity="0.75" />
              <stop offset="45%" stopColor={sl.color} stopOpacity="1" />
              <stop offset="100%" stopColor={sl.dark} stopOpacity="1" />
            </radialGradient>
          ))}
          <radialGradient id={`${chartId}-hole`} cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>
        </defs>

        {/* Slices */}
        {built.map(({ sl, i, start, end, push }) => {
          if (end <= start) return null;
          const isH = hov === i;
          return (
            <g
              key={i}
              style={{
                transform: `translate(${push.x - cx}px, ${push.y - cy}px)`,
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'transform 0.25s ease-out',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            >
              <path
                d={donutPath(cx, cy, outerR, innerR, start, end)}
                fill={`url(#${chartId}-g${i})`}
                opacity={!hov || isH ? 1 : 0.38}
                stroke="#fff"
                strokeWidth="0.6"
                style={{ transition: 'opacity 0.2s' }}
              />
            </g>
          );
        })}

        {/* Center hole */}
        <circle cx={cx} cy={cy} r={innerR} fill={`url(#${chartId}-hole)`} />

        {/* Center text */}
        {hov !== null && slices[hov] ? (
          <>
            <text x={cx} y={cy - 10} textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="700" fontFamily={FONT}>
              {slices[hov].label}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="900" fontFamily={MONO}>
              {(slices[hov].value / 1000).toFixed(1)}
            </text>
            <text x={cx} y={cy + 30} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily={MONO}>
              {centerUnit}
            </text>
          </>
        ) : (
          <>
            <text x={cx} y={cy + 8} textAnchor="middle" fill="#334155" fontSize="26" fontWeight="900" fontFamily={MONO}>
              {(total / 1000).toFixed(1)}
            </text>
            <text x={cx} y={cy + 26} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily={MONO}>
              {centerUnit}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function LegendItem({ slice, percent, tons }: { slice: Slice; percent: number; tons: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(0,0,0,0.06)',
        fontSize: 13,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${slice.color}, ${slice.dark})`,
          boxShadow: `0 1px 4px ${slice.color}60`,
        }}
      />
      <span style={{ flex: 1, color: '#334155', fontWeight: 600, fontFamily: FONT }}>{slice.label}</span>
      <span style={{ color: slice.color, fontWeight: 800, fontFamily: MONO, minWidth: 50, textAlign: 'right' }}>
        {percent.toFixed(1)}%
      </span>
      <span style={{ color: '#475569', fontFamily: MONO, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
        {tons.toFixed(1)} t
      </span>
    </div>
  );
}

function BudgetKPICard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${accent}35`,
        background: `linear-gradient(135deg, ${accent}14, rgba(255,255,255,0.95))`,
        padding: '14px 16px',
        boxShadow: `0 8px 22px ${accent}1f`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            color: '#fff',
            background: accent,
            fontSize: 12,
            fontFamily: MONO,
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', fontFamily: FONT }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', fontFamily: MONO, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontFamily: FONT }}>{sub}</div>
    </div>
  );
}

export default function CarbonBudgetCard({ before, after }: { before: BudgetRow[] | null | undefined; after: BudgetRow[] | null | undefined }) {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const fn = () => setIsNarrow(window.innerWidth < 720);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Baseline values ─────────────────────────────────────
  const totalEm   = getVal(before, 'total emission');
  const totalSeq  = getVal(before, 'total sequestration');
  const netEm     = getVal(before, 'net emission');
  const coverage  = totalEm > 0 ? (totalSeq / totalEm) * 100 : 0;

  // ── After values ────────────────────────────────────────
  const prevNet   = getVal(after, 'previous net') || netEm;
  const newNet    = getVal(after, 'new net');
  const emRed     = getVal(after, 'emission reduction');
  const seqInc    = getVal(after, 'sequestration increase');
  const pctRed    = prevNet > 0 ? ((prevNet - newNet) / prevNet) * 100 : 0;
  const SHARED_COLORS = [
    { color: '#22c55e', dark: '#15803d' },
    { color: '#3b82f6', dark: '#1d4ed8' },
    { color: '#8b5cf6', dark: '#6d28d9' },
  ];
  const NET_RED = { color: '#ef4444', dark: '#b91c1c' };

  // ── Slices for BEFORE ───────────────────────────────────
  const beforeSlices: Slice[] = [];
  if (totalEm > 0) {
    const seqP  = Math.max(totalSeq, 0);
    const netP  = Math.max(netEm, 0);
    const remP  = Math.max(totalEm - seqP - netP, 0);

    if (seqP  > 0) beforeSlices.push({ label: 'Sequestered',     value: seqP,  ...SHARED_COLORS[0] });
    if (netP   > 0) beforeSlices.push({ label: 'Net Emission',    value: netP,  ...NET_RED });
    if (remP   > 0) beforeSlices.push({ label: 'Gross Remaining', value: remP,  ...SHARED_COLORS[2] });
  }
  if (beforeSlices.length === 0) beforeSlices.push({ label: 'No Data', value: 1, color: '#9ca3af', dark: '#6b7280' });

  // ── Slices for AFTER ────────────────────────────────────
  const afterSlices: Slice[] = [];
  if (emRed  > 0) afterSlices.push({ label: 'Reduced',          value: emRed,  ...SHARED_COLORS[1] });
  if (seqInc > 0) afterSlices.push({ label: 'Seq. Increase',    value: seqInc, ...SHARED_COLORS[0] });
  if (newNet > 0) afterSlices.push({ label: 'New Net Emission', value: newNet, ...NET_RED });
  if (afterSlices.length === 0) afterSlices.push({ label: 'No Change', value: 1, color: '#9ca3af', dark: '#6b7280' });

  const layout = isNarrow ? 'column' : 'row';

  return (
    <div className="card" style={{ height: '100%', background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#0f172a', fontFamily: FONT }}>Carbon Budget Comparison</h3>
      <p style={{ margin: '4px 0 20px', color: '#64748b', fontSize: 13.5, fontFamily: FONT }}>Before vs After Intervention</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2 mb-7">
        <BudgetKPICard
          label="Total Emissions"
          value={totalEm > 0 ? `${(totalEm / 1000).toFixed(1)} t` : '--'}
          sub="CO2e / year"
          accent="#ef4444"
          icon="E"
        />
        <BudgetKPICard
          label="Net After Reduction"
          value={newNet > 0 ? `${(newNet / 1000).toFixed(1)} t` : '--'}
          sub="CO2e / year"
          accent="#ef4444"
          icon="N"
        />
        <BudgetKPICard
          label="Reduction Achieved"
          value={pctRed > 0 ? `${pctRed.toFixed(1)}%` : '--'}
          sub="via interventions"
          accent="#8b5cf6"
          icon="R"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.05fr 1.35fr', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {before && before.length > 0 && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 10, fontFamily: FONT }}>
                BASELINE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px 12px', fontSize: 13 }}>
                <div>Total Emission</div>     <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#dc2626' }}>{(totalEm/1000).toFixed(1)} t</div>
                <div>Sequestered</div>        <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#16a34a' }}>{(totalSeq/1000).toFixed(1)} t</div>
                <div>Net Emission</div>       <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#ef4444' }}>{(netEm/1000).toFixed(1)} t</div>
                <div>Coverage</div>           <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: coverage > 40 ? '#16a34a' : coverage > 15 ? '#ca8a04' : '#dc2626' }}>{coverage.toFixed(0)}%</div>
              </div>
            </div>
          )}

          {after && after.length > 0 && (
            <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 10, fontFamily: FONT }}>
                AFTER INTERVENTION
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px 12px', fontSize: 13 }}>
                <div>Previous Net</div>       <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#ef4444' }}>{(prevNet/1000).toFixed(1)} t</div>
                <div>New Net</div>            <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#ef4444' }}>{(newNet/1000).toFixed(1)} t</div>
                <div>Emission Reduced</div>   <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#3b82f6' }}>{(emRed/1000).toFixed(1)} t</div>
                <div>Seq. Increase</div>      <div style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#16a34a' }}>{(seqInc/1000).toFixed(1)} t</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: layout, gap: 20, justifyContent: 'center' }}>
          <div style={{ flex: 1, maxWidth: 320 }}>
            <DonutChart slices={beforeSlices} title="Baseline (Before)" size={240} />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {beforeSlices.map((sl, i) => (
                <LegendItem
                  key={i}
                  slice={sl}
                  percent={(sl.value / beforeSlices.reduce((a, b) => a + b.value, 0)) * 100}
                  tons={sl.value / 1000}
                />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: 320 }}>
            <DonutChart slices={afterSlices} title="After Intervention" size={240} />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {afterSlices.map((sl, i) => (
                <LegendItem
                  key={i}
                  slice={sl}
                  percent={(sl.value / afterSlices.reduce((a, b) => a + b.value, 0)) * 100}
                  tons={sl.value / 1000}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

