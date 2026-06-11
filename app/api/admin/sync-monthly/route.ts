import { NextResponse } from 'next/server';

import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { readCSV, writeCSV, upsertRowsByVlcode, CsvRow } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

const VILLAGE_FILE = 'Village.csv';
const MONTHLY_FILE = 'Monthly_Activity_Wide.csv';

// Monthly_Activity_Wide column  ←  Village.csv source column
const FIELD_MAP: { monthly: string; village: string }[] = [
  { monthly: 'Electricity_Consumption_kWh',  village: 'Energy_Electricity' },
  { monthly: 'Firewood_Consumption_kg',      village: 'Residential_Firewood' },
  { monthly: 'LPG_Consumption_kg',           village: 'Residential_LPG' },
  { monthly: 'Livestock_Count',              village: 'total_livestock' },
  { monthly: 'Petrol_Consumption_Litres',    village: 'Transport_Petrol Vehicles' },
  { monthly: 'Solid_Waste_kg',               village: 'Waste_Solid Waste' },
  { monthly: 'Vehicles_(2-wheelers)_Count',  village: 'total_vehicles' },
];

// POST — pull data from Village.csv and upsert it into Monthly_Activity_Wide.csv
export async function POST() {
  try {
    await getAdminSession();

    const village = await readCSV(VILLAGE_FILE);
    const vPkCol   = village.headers[0] ?? 'vlcode';
    const vNameCol = village.headers[1] ?? 'village_name';

    // Read the monthly file to learn its header layout. If it does not exist
    // yet, fall back to the canonical column order.
    let monthly: { headers: string[]; rows: CsvRow[] };
    try {
      const existing = await readCSV(MONTHLY_FILE);
      monthly = { headers: existing.headers, rows: existing.rows };
    } catch {
      monthly = {
        headers: ['vlcode', 'village_name', ...FIELD_MAP.map((f) => f.monthly)],
        rows: [],
      };
    }

    const mPkCol   = monthly.headers[0] ?? 'vlcode';
    const mNameCol = monthly.headers[1] ?? 'village_name';

    // Only sync mappings whose target column actually exists in the monthly file.
    const activeMap = FIELD_MAP.filter((f) => monthly.headers.includes(f.monthly));

    const newRows: CsvRow[] = [];
    for (const vrow of village.rows) {
      const pk = (vrow[vPkCol] ?? '').trim();
      if (!pk) continue;

      const row: CsvRow = {
        [mPkCol]:   pk,
        [mNameCol]: (vrow[vNameCol] ?? '').trim(),
      };
      for (const { monthly: mCol, village: vCol } of activeMap) {
        row[mCol] = (vrow[vCol] ?? '').trim();
      }
      newRows.push(row);
    }

    if (newRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No villages found in Village.csv to sync.' },
        { status: 400 }
      );
    }

    const upserted = upsertRowsByVlcode(monthly.rows, newRows, monthly.headers);
    await writeCSV(MONTHLY_FILE, monthly.headers, upserted);

    return NextResponse.json({
      success: true,
      syncedVillages: newRows.length,
      mappedColumns: activeMap.map((f) => f.monthly),
      message: `Synced ${newRows.length} village(s) from ${VILLAGE_FILE} into ${MONTHLY_FILE}.`,
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[/api/admin/sync-monthly]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to sync monthly data.' },
      { status: 500 }
    );
  }
}
