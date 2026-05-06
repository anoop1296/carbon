// Reads budget.csv — columns prefixed before_ / after_ are split into two groups.
// All parameters returned dynamically; no hardcoded field names.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

function toLabel(col: string): string {
  return col.replace(/_/g, ' ').replace(/\+/g, '+').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('budget.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;

    const before: Record<string, string>[] = [];
    const after:  Record<string, string>[] = [];

    for (const row of filtered) {
      for (const col of headers) {
        if (identity.has(col)) continue;
        const val = row[col] || '0';

        if (col.startsWith('before_')) {
          before.push({ [pkCol]: row[pkCol], [nameCol]: row[nameCol], parameter: toLabel(col.slice(7)), value: val });
        } else if (col.startsWith('after_')) {
          after.push({ [pkCol]: row[pkCol], [nameCol]: row[nameCol], parameter: toLabel(col.slice(6)), value: val });
        } else {
          before.push({ [pkCol]: row[pkCol], [nameCol]: row[nameCol], parameter: toLabel(col), value: val });
        }
      }
    }

    return NextResponse.json({ success: true, before, after });
  } catch (e) {
    console.error('[/api/carbon-budget]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
