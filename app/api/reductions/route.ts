// app/api/reductions/route.ts
// Fully dynamic: first two columns = pk + name.
// Each other column = "Sector_Intervention..." → derived dynamically.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

function deriveReduction(col: string): { sector: string; intervention: string } {
  const idx = col.indexOf('_');
  if (idx === -1) return { sector: col, intervention: col };
  return {
    sector:       col.slice(0, idx),
    intervention: col.slice(idx + 1).replace(/_/g, ' ').trim(),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('Carbon_Reduction_After_Wide.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;
    const data: Record<string, string>[] = [];

    for (const row of filtered) {
      for (const [col, val] of Object.entries(row)) {
        if (identity.has(col)) continue;
        const { sector, intervention } = deriveReduction(col);
        data.push({
          [pkCol]:                 row[pkCol],
          [nameCol]:               row[nameCol],
          sector,
          intervention,
          activity_reduction:      row[`${col}_activity_reduction`] || '0',
          emission_factor:         row[`${col}_emission_factor`]    || '0',
          annual_co2_reduction_kg: val || '0',
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/reductions]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
