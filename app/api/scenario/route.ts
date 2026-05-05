// app/api/scenario/route.ts
// Wide CSV: vlcode, village_name, PREFIX_YEAR, PREFIX_YEAR, ...
// Auto-detects all PREFIX groups (e.g. BAU, LOS, ACC) and years from column names.
// Returns: { vlcode, village_name, year, <scenario_key>: value, ... }
// scenario_key is lowercased prefix (e.g. bau_2023 → prefix "bau", mapped to readable label)
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

// Known label mappings for common prefix abbreviations
const LABEL_MAP: Record<string, string> = {
  bau: 'business_as_usual',
  los: 'line_of_sight',
  acc: 'accelerated',
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vlcode = searchParams.get('vlcode') || '';

    const { headers, rows } = await readCSV('Scenario_Projection_Wide.csv');
    const pkCol   = headers[0] ?? 'vlcode';
    const nameCol = headers[1] ?? 'village_name';
    const identity = new Set([pkCol, nameCol]);

    const filtered = vlcode ? rows.filter(r => r[pkCol] === vlcode) : rows;

    // Auto-detect PREFIX_YEAR pattern from column names
    const prefixYears = new Map<string, Set<string>>(); // prefix → set of years
    for (const col of headers) {
      if (identity.has(col)) continue;
      const m = col.match(/^([A-Za-z][A-Za-z0-9]*)_(\d{4})$/);
      if (m) {
        const prefix = m[1].toLowerCase();
        const year   = m[2];
        if (!prefixYears.has(prefix)) prefixYears.set(prefix, new Set());
        prefixYears.get(prefix)!.add(year);
      }
    }

    if (prefixYears.size === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // All years across all prefixes, sorted
    const allYears = Array.from(
      new Set(Array.from(prefixYears.values()).flatMap(s => Array.from(s)))
    ).sort();

    // Map prefix → output key name (use known labels if available, else use prefix itself)
    const prefixKeys = Array.from(prefixYears.keys()).map(prefix => ({
      prefix,
      outKey: LABEL_MAP[prefix] || prefix,
    }));

    const data: Record<string, string>[] = [];
    for (const row of filtered) {
      for (const year of allYears) {
        const entry: Record<string, string> = {
          [pkCol]:   row[pkCol],
          [nameCol]: row[nameCol],
          year,
        };
        for (const { prefix, outKey } of prefixKeys) {
          // Find the original column (case-insensitive prefix match)
          const originalCol = headers.find(
            h => h.toLowerCase() === `${prefix}_${year}`
          );
          entry[outKey] = (originalCol ? row[originalCol] : '') || '0';
        }
        data.push(entry);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/scenario]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
