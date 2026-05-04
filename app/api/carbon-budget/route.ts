// app/api/carbon-budget/route.ts
// Fully dynamic: first two columns = pk + name. All others become { parameter, value } rows.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

function toLabel(col: string): string {
  return col.replace(/_/g, ' ').replace(/\+/g, '+').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function wideToParams(
  headers: string[],
  rows: Record<string, string>[],
  pkFilter: string
): Record<string, string>[] {
  const pkCol   = headers[0] ?? 'vlcode';
  const nameCol = headers[1] ?? 'village_name';
  const identity = new Set([pkCol, nameCol]);
  const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;
  const result: Record<string, string>[] = [];
  for (const row of filtered) {
    for (const [col, val] of Object.entries(row)) {
      if (identity.has(col)) continue;
      result.push({
        [pkCol]:   row[pkCol],
        [nameCol]: row[nameCol],
        parameter: toLabel(col),
        value:     val || '0',
      });
    }
  }
  return result;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const [beforeCsv, afterCsv] = await Promise.all([
      readCSV('Carbon_Budget_Before_Wide.csv'),
      readCSV('Carbon_Budget_After_Wide.csv'),
    ]);

    const before = wideToParams(beforeCsv.headers, beforeCsv.rows, pkFilter);
    const after  = wideToParams(afterCsv.headers,  afterCsv.rows,  pkFilter);

    return NextResponse.json({ success: true, before, after });
  } catch (e) {
    console.error('[/api/carbon-budget]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
