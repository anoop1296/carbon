import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('emissions.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;
    const data: Record<string, string>[] = [];

    const titleCase = (s: string) => s.replace(/\b[a-z]/g, c => c.toUpperCase());

    for (const row of filtered) {
      for (const [col, val] of Object.entries(row)) {
        if (identity.has(col)) continue;
        // Columns without an underscore still flow through — they go under a
        // "General" sector so admin-added simple names (e.g. "gaurav") still
        // surface on the dashboard.
        const idx          = col.indexOf('_');
        const sector       = titleCase(idx > 0 ? col.slice(0, idx) : 'General');
        const activity     = titleCase(idx > 0 ? col.slice(idx + 1).replace(/_/g, ' ') : col.replace(/_/g, ' '));
        data.push({
          [pkCol]:       row[pkCol],
          [nameCol]:     row[nameCol],
          sector,
          activity,
          annual_co2_kg: val || '0',
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/emissions]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
