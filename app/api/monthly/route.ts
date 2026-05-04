// app/api/monthly/route.ts
// Fully dynamic: first two columns = pk + name. All others = activity columns.
// Activity label = underscores → spaces, trailing unit suffix stripped.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

function deriveActivityAndUnit(col: string): { activity: string; unit: string } {
  const parts = col.split('_');
  const last = parts[parts.length - 1];
  const unitLike = /^(kWh|kg|Litres|Count|L|t|kwh|litre|litres|count|tonnes|units|pcs|nos)$/i.test(last);
  const actParts = unitLike ? parts.slice(0, -1) : parts;
  return {
    activity: actParts.join(' ').trim(),
    unit:     unitLike ? last : '',
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('Monthly_Activity_Wide.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;
    const data: Record<string, string>[] = [];

    for (const row of filtered) {
      for (const [col, val] of Object.entries(row)) {
        if (identity.has(col)) continue;
        const { activity, unit } = deriveActivityAndUnit(col);
        data.push({
          [pkCol]:          row[pkCol],
          [nameCol]:        row[nameCol],
          activity,
          unit,
          monthly_quantity: val || '0',
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/monthly]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
