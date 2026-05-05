'use client';

export type VillageRow = Record<string, string>;

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

function toLabel(k: string) { return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function toSuffix(k: string) {
  if (/_ha$/i.test(k))  return 'ha';
  if (/_kg$/i.test(k))  return 'kg';
  if (/_kwh$/i.test(k)) return 'kWh';
  return '';
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function Overview({ village }: { village: VillageRow }) {
  const name     = Object.values(village)[1] || Object.values(village)[0] || '—';
  const district = Object.entries(village).slice(2)
    .filter(([, val]) => val && isNaN(parseFloat(val)))
    .map(([, val]) => val).join(' · ');

  const textMeta = Object.entries(village).slice(2).filter(([, val]) => val && isNaN(parseFloat(val)));
  const stats    = Object.entries(village).slice(2)
    .filter(([, val]) => { const n = parseFloat(val || ''); return Number.isFinite(n); })
    .map(([key, val], i) => ({
      label:  toLabel(key),
      suffix: toSuffix(key),
      value:  parseFloat(val || '0'),
      c:      CARD_COLORS[i % CARD_COLORS.length],
    }));

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
              <div key={stat.label} className={`rounded-xl border px-4 py-4 ${stat.c.bg} ${stat.c.border}`}>
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
