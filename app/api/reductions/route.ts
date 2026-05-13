// Reads interventions.csv — fully dynamic, all non-identity columns returned as-is.
// Intervention name = exact column name from admin (underscores rendered as spaces).
// Sector = first underscore-separated segment if present, else 'General'.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('interventions.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;
    const data: Record<string, string>[] = [];

    const titleCase = (s: string) => s.replace(/\b\p{L}/gu, c => c.toUpperCase());

    for (const row of filtered) {
      for (const [col, val] of Object.entries(row)) {
        if (identity.has(col)) continue;
        const idx          = col.indexOf('_');
        const sector       = titleCase(idx > 0 ? col.slice(0, idx) : 'General');
        const intervention = titleCase(col.replace(/_/g, ' ').trim());
        data.push({
          [pkCol]:              row[pkCol],
          [nameCol]:            row[nameCol],
          sector,
          intervention,
          column:               col,
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
