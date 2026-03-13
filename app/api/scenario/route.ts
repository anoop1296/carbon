// app/api/scenario/route.ts
// Wide cols: vlcode, village_name,
//   BAU_2023, BAU_2025, BAU_2030, BAU_2035,
//   LOS_2023, LOS_2025, LOS_2030, LOS_2035,
//   ACC_2023, ACC_2025, ACC_2030, ACC_2035
//
// Component ScenarioRow: { vlcode, village_name, year,
//   business_as_usual, line_of_sight, accelerated }
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vlcode = searchParams.get('vlcode') || '';

    const rows = parseCSV('Scenario_Projection_Wide.csv');
    const filtered = vlcode ? rows.filter(r => r.vlcode === vlcode) : rows;

    // Collect all years from column names
    const years = new Set<string>();
    for (const row of filtered) {
      for (const col of Object.keys(row)) {
        const m = col.match(/^(?:BAU|LOS|ACC)_(\d{4})$/);
        if (m) years.add(m[1]);
      }
    }

    const data: Record<string, string>[] = [];
    for (const row of filtered) {
      for (const year of Array.from(years).sort()) {
        data.push({
          vlcode:           row.vlcode,
          village_name:     row.village_name,
          year,
          business_as_usual: row[`BAU_${year}`] || '0',
          line_of_sight:     row[`LOS_${year}`] || '0',
          accelerated:       row[`ACC_${year}`] || '0',
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/scenario]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
