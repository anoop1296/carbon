// app/api/monthly/route.ts
// Wide cols: vlcode, village_name,
//   Electricity_Consumption_kWh, Firewood_Consumption_kg, LPG_Consumption_kg,
//   Livestock_Count, Petrol_Consumption_Litres, Solid_Waste_kg,
//   Vehicles_(2-wheelers)_Count
//
// Component MonthlyRow: { vlcode, village_name, activity, unit, monthly_quantity }
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

// Maps wide column → { activity label, unit }
const MONTHLY_META: Record<string, { activity: string; unit: string }> = {
  'Electricity_Consumption_kWh':    { activity: 'Electricity Consumption', unit: 'kWh'    },
  'Firewood_Consumption_kg':        { activity: 'Firewood Consumption',    unit: 'kg'     },
  'LPG_Consumption_kg':             { activity: 'LPG Consumption',         unit: 'kg'     },
  'Livestock_Count':                { activity: 'Livestock',               unit: 'Count'  },
  'Petrol_Consumption_Litres':      { activity: 'Petrol Consumption',      unit: 'Litres' },
  'Solid_Waste_kg':                 { activity: 'Solid Waste',             unit: 'kg'     },
  'Vehicles_(2-wheelers)_Count':    { activity: 'Vehicles (2-wheelers)',   unit: 'Count'  },
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vlcode = searchParams.get('vlcode') || '';

    const rows = parseCSV('Monthly_Activity_Wide.csv');
    const filtered = vlcode ? rows.filter(r => r.vlcode === vlcode) : rows;

    const data: Record<string, string>[] = [];
    for (const row of filtered) {
      for (const [col, meta] of Object.entries(MONTHLY_META)) {
        if (col in row) {
          data.push({
            vlcode:          row.vlcode,
            village_name:    row.village_name,
            activity:        meta.activity,
            unit:            meta.unit,
            monthly_quantity: row[col] || '0',
          });
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/monthly]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
