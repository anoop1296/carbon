// app/api/emissions/route.ts
// Wide CSV cols: vlcode, village_name, Sector_Activity...
// Component expects: { vlcode, village_name, sector, activity, annual_co2_kg }
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vlcode = searchParams.get('vlcode') || '';

    const rows = parseCSV('Annual_Emissions_Wide.csv');
    const filtered = vlcode ? rows.filter(r => r.vlcode === vlcode) : rows;

    // Unpivot: each non-identity column is "Sector_Activity"
    const identity = new Set(['vlcode', 'village_name']);
    const data: Record<string, string>[] = [];

    for (const row of filtered) {
      for (const [col, val] of Object.entries(row)) {
        if (identity.has(col)) continue;
        // col format: "Agriculture_Rice (Kharif)" or "Residential_LPG"
        const underscoreIdx = col.indexOf('_');
        if (underscoreIdx === -1) continue;
        const sector   = col.slice(0, underscoreIdx);
        const activity = col.slice(underscoreIdx + 1);
        data.push({
          vlcode: row.vlcode,
          village_name: row.village_name,
          sector,
          activity,
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
