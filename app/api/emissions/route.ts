// app/api/emissions/route.ts
// Wide CSV: first two columns are the identity key (pk) and name.
// All remaining columns are "Sector_Activity" pairs → unpivoted.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('Annual_Emissions_Wide.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;
    const data: Record<string, string>[] = [];

    for (const row of filtered) {
      for (const [col, val] of Object.entries(row)) {
        if (identity.has(col)) continue;
        const idx = col.indexOf('_');
        if (idx === -1) continue;
        data.push({
          [pkCol]:   row[pkCol],
          [nameCol]: row[nameCol],
          sector:    col.slice(0, idx),
          activity:  col.slice(idx + 1),
          annual_co2_kg: val,
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/emissions]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
