// app/api/carbon-budget/route.ts
// Wide Before cols: vlcode, village_name, net_emission, net_monthly_emission,
//                   per_capita_emission, total_emission, total_sequestration
// Wide After cols:  vlcode, village_name, new_net_emission, percentage_reduction_pct,
//                   previous_net_emission, total_emission_reduction,
//                   total_impact_reduction_+_sequestration, total_sequestration_increase
//
// Component expects: { vlcode, village_name, parameter, value, unit? }
// It looks up by parameter.toLowerCase().includes(keyword)
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

// Map wide column → parameter label the component searches for
const BEFORE_MAP: Record<string, string> = {
  total_emission:        'Total Emission',
  total_sequestration:   'Total Sequestration',
  net_emission:          'Net Emission',
  per_capita_emission:   'Per Capita Emission',
  net_monthly_emission:  'Net Monthly Emission',
};

const AFTER_MAP: Record<string, string> = {
  previous_net_emission:                    'Previous Net Emission',
  total_emission_reduction:                 'Total Emission Reduction',
  total_sequestration_increase:             'Total Sequestration Increase',
  'total_impact_reduction_+_sequestration': 'Total Impact (Reduction + Sequestration)',
  new_net_emission:                         'New Net Emission',
  percentage_reduction_pct:                 'Percentage Reduction (%)',
};

function wideToParams(
  rows: Record<string, string>[],
  colMap: Record<string, string>,
  vlcode: string
): Record<string, string>[] {
  const filtered = vlcode ? rows.filter(r => r.vlcode === vlcode) : rows;
  const result: Record<string, string>[] = [];
  for (const row of filtered) {
    for (const [col, label] of Object.entries(colMap)) {
      if (col in row) {
        result.push({
          vlcode:       row.vlcode,
          village_name: row.village_name,
          parameter:    label,
          value:        row[col] || '0',
        });
      }
    }
  }
  return result;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vlcode = searchParams.get('vlcode') || '';

    const beforeRaw = parseCSV('Carbon_Budget_Before_Wide.csv');
    const afterRaw  = parseCSV('Carbon_Budget_After_Wide.csv');

    const before = wideToParams(beforeRaw, BEFORE_MAP, vlcode);
    const after  = wideToParams(afterRaw,  AFTER_MAP,  vlcode);

    return NextResponse.json({ success: true, before, after });
  } catch (e) {
    console.error('[/api/carbon-budget]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
