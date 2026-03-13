// app/api/reductions/route.ts
// Wide cols: vlcode, village_name,
//   Agriculture_Rice_Methane_Reducti, Biomass_Improved_Cookstove_(,
//   Cooking_LPG_Efficiency_(10%), Energy_Solar_Rooftop_(500_M,
//   Transport_EV_Adoption_(20%), Waste_Composting_(30%)
//
// Component ReductionRow: { vlcode, village_name, sector, intervention,
//   activity_reduction, emission_factor, annual_co2_reduction_kg }
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

// Maps truncated wide column → full metadata
const REDUCTION_META: Array<{
  col: string;
  sector: string;
  intervention: string;
  activity_reduction: string;
  emission_factor: string;
}> = [
  {
    col: 'Agriculture_Rice_Methane_Reducti',
    sector: 'Agriculture',
    intervention: 'Rice Methane Reduction (15%)',
    activity_reduction: '20.7',
    emission_factor: '3960',
  },
  {
    col: 'Biomass_Improved_Cookstove_(',
    sector: 'Biomass',
    intervention: 'Improved Cookstove (20%)',
    activity_reduction: '10008',
    emission_factor: '2.06',
  },
  {
    col: 'Cooking_LPG_Efficiency_(10%)',
    sector: 'Cooking',
    intervention: 'LPG Efficiency (10%)',
    activity_reduction: '5181.6',
    emission_factor: '3.09',
  },
  {
    col: 'Energy_Solar_Rooftop_(500_M',
    sector: 'Energy',
    intervention: 'Solar Rooftop (500 MWh)',
    activity_reduction: '500000',
    emission_factor: '0.9',
  },
  {
    col: 'Transport_EV_Adoption_(20%)',
    sector: 'Transport',
    intervention: 'EV Adoption (20%)',
    activity_reduction: '2971.2',
    emission_factor: '2.65',
  },
  {
    col: 'Waste_Composting_(30%)',
    sector: 'Waste',
    intervention: 'Composting (30%)',
    activity_reduction: '77526',
    emission_factor: '1.3',
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vlcode = searchParams.get('vlcode') || '';

    const rows = parseCSV('Carbon_Reduction_After_Wide.csv');
    const filtered = vlcode ? rows.filter(r => r.vlcode === vlcode) : rows;

    const data: Record<string, string>[] = [];
    for (const row of filtered) {
      for (const meta of REDUCTION_META) {
        if (meta.col in row) {
          data.push({
            vlcode:                  row.vlcode,
            village_name:            row.village_name,
            sector:                  meta.sector,
            intervention:            meta.intervention,
            activity_reduction:      meta.activity_reduction,
            emission_factor:         meta.emission_factor,
            annual_co2_reduction_kg: row[meta.col] || '0',
          });
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/reductions]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
