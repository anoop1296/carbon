// app/api/sequestration/route.ts
// Fully dynamic: first two columns = pk + name.
// Before: cols ending _area_ha / _annual_co2_sequestered_kg → source name extracted.
// After:  cols ending _seq_kg → type + intervention extracted from prefix.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { readCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pkFilter = searchParams.get('vlcode') || '';

    const [beforeCsv, afterCsv] = await Promise.all([
      readCSV('Carbon_Sequestration_Before_Wide.csv'),
      readCSV('Carbon_Sequestration_After_Wide.csv'),
    ]);

    // ── BEFORE ──────────────────────────────────────────────────────────────
    const bPkCol   = beforeCsv.headers[0] ?? 'vlcode';
    const bNameCol = beforeCsv.headers[1] ?? 'village_name';
    const bIdentity = new Set([bPkCol, bNameCol]);

    const beforeFiltered = pkFilter
      ? beforeCsv.rows.filter(r => r[bPkCol] === pkFilter)
      : beforeCsv.rows;

    const before: Record<string, string>[] = [];
    for (const row of beforeFiltered) {
      const sources = new Set<string>();
      for (const col of Object.keys(row)) {
        if (bIdentity.has(col)) continue;
        const areaMatch = col.match(/^(.+)_area_ha$/);
        const co2Match  = col.match(/^(.+)_annual_co2_sequestered_kg$/);
        if (areaMatch) sources.add(areaMatch[1]);
        if (co2Match)  sources.add(co2Match[1]);
      }
      for (const src of Array.from(sources)) {
        before.push({
          [bPkCol]:                  row[bPkCol],
          [bNameCol]:                row[bNameCol],
          source:                    src,
          area_ha:                   row[`${src}_area_ha`]                    || '0',
          annual_co2_sequestered_kg: row[`${src}_annual_co2_sequestered_kg`]  || '0',
        });
      }
    }

    // ── AFTER ────────────────────────────────────────────────────────────────
    const aPkCol   = afterCsv.headers[0] ?? 'vlcode';
    const aNameCol = afterCsv.headers[1] ?? 'village_name';
    const aIdentity = new Set([aPkCol, aNameCol]);

    const afterFiltered = pkFilter
      ? afterCsv.rows.filter(r => r[aPkCol] === pkFilter)
      : afterCsv.rows;

    const after: Record<string, string>[] = [];
    for (const row of afterFiltered) {
      for (const [col, val] of Object.entries(row)) {
        if (aIdentity.has(col)) continue;
        const seqMatch = col.match(/^(.+)_seq_kg$/i);
        if (!seqMatch) continue;
        const body = seqMatch[1];
        const idx  = body.indexOf('_');
        const type         = idx !== -1 ? body.slice(0, idx) : body;
        const intervention = idx !== -1 ? body.slice(idx + 1).replace(/_/g, ' ').trim() : body;
        after.push({
          [aPkCol]:                    row[aPkCol],
          [aNameCol]:                  row[aNameCol],
          type,
          intervention,
          area_added_ha:               row[`${col}_area_ha`]         || '0',
          sequestration_factor:        row[`${col}_factor_kg_ha_yr`] || '0',
          annual_co2_sequestration_kg: val || '0',
        });
      }
    }

    return NextResponse.json({ success: true, before, after });
  } catch (e) {
    console.error('[/api/sequestration]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
