// Reads sequestration.csv — columns prefixed before_ / after_ are split into two groups.
// Everything is fully dynamic: no hardcoded field names beyond the prefix convention.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('sequestration.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = pkFilter ? rows.filter(r => r[pkCol] === pkFilter) : rows;

    const before: Record<string, string>[] = [];
    const after:  Record<string, string>[] = [];

    for (const row of filtered) {
      const bEntry: Record<string, string> = { [pkCol]: row[pkCol], [nameCol]: row[nameCol] };
      const aEntry: Record<string, string> = { [pkCol]: row[pkCol], [nameCol]: row[nameCol] };
      let hasBefore = false;
      let hasAfter  = false;

      for (const col of headers) {
        if (identity.has(col)) continue;
        if (col.startsWith('before_')) {
          bEntry[col.slice(7)] = row[col] || '';
          hasBefore = true;
        } else if (col.startsWith('after_')) {
          aEntry[col.slice(6)] = row[col] || '';
          hasAfter = true;
        } else {
          // untagged columns go to before
          bEntry[col] = row[col] || '';
          hasBefore = true;
        }
      }

      if (hasBefore) before.push(bEntry);
      if (hasAfter)  after.push(aEntry);
    }

    return NextResponse.json({ success: true, before, after });
  } catch (e) {
    console.error('[/api/sequestration]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
