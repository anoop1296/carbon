// app/api/sequestration/route.ts
//
// Before wide cols: vlcode, village_name,
//   "Forest Cover_annual_co2_sequestered_kg", "Forest Cover_area_ha"
// Component SeqBeforeRow: { vlcode, village_name, source, area_ha, annual_co2_sequestered_kg }
//
// After wide cols: vlcode, village_name,
//   "Agroforestry_Tree_Plantation_15ha_seq_kg",
//   "Forestry_Afforestation_(_10ha_seq_kg",
//   "Green Belt_Village_Plantat_5ha_seq_kg",
//   "Soil Carbon_Organic_Farming_20ha_seq_kg"
// Component SeqAfterRow: { vlcode, village_name, type, intervention, area_added_ha, sequestration_factor, annual_co2_sequestration_kg }
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vlcode = searchParams.get('vlcode') || '';

    // ── BEFORE ──────────────────────────────────────────────────────
    const beforeRaw = parseCSV('Carbon_Sequestration_Before_Wide.csv');
    const beforeFiltered = vlcode ? beforeRaw.filter(r => r.vlcode === vlcode) : beforeRaw;

    // Wide cols look like "Forest Cover_annual_co2_sequestered_kg" and "Forest Cover_area_ha"
    // Group by source (everything before last underscore-delimited suffix)
    const before: Record<string, string>[] = [];
    for (const row of beforeFiltered) {
      // Find all unique sources
      const sources = new Set<string>();
      for (const col of Object.keys(row)) {
        if (col === 'vlcode' || col === 'village_name') continue;
        // col = "Forest Cover_area_ha" or "Forest Cover_annual_co2_sequestered_kg"
        // Source = everything up to last underscore group that's a known suffix
        const areaMatch = col.match(/^(.+)_area_ha$/);
        const co2Match  = col.match(/^(.+)_annual_co2_sequestered_kg$/);
        if (areaMatch)  sources.add(areaMatch[1]);
        if (co2Match)   sources.add(co2Match[1]);
      }
      for (const src of Array.from(sources)) {
        before.push({
          vlcode:                   row.vlcode,
          village_name:             row.village_name,
          source:                   src,
          area_ha:                  row[`${src}_area_ha`]                   || '0',
          annual_co2_sequestered_kg: row[`${src}_annual_co2_sequestered_kg`] || '0',
        });
      }
    }

    // ── AFTER ───────────────────────────────────────────────────────
    // Col format: "Type_Intervention_Xha_seq_kg"
    // We need to derive: type, intervention, area_added_ha, sequestration_factor, annual_co2_sequestration_kg
    // Original data reference for reconstruction:
    const AFTER_META: Array<{ col: string; type: string; intervention: string; area_added_ha: string; sequestration_factor: string }> = [
      { col: 'Agroforestry_Tree_Plantation_15ha_seq_kg', type: 'Agroforestry', intervention: 'Tree Plantation (15 ha)', area_added_ha: '15', sequestration_factor: '750' },
      { col: 'Forestry_Afforestation_(_10ha_seq_kg',     type: 'Forestry',     intervention: 'Afforestation (10 ha)',   area_added_ha: '10', sequestration_factor: '900' },
      { col: 'Green Belt_Village_Plantat_5ha_seq_kg',    type: 'Green Belt',   intervention: 'Village Plantation (5 ha)', area_added_ha: '5', sequestration_factor: '850' },
      { col: 'Soil Carbon_Organic_Farming_20ha_seq_kg',  type: 'Soil Carbon',  intervention: 'Organic Farming (20 ha)', area_added_ha: '20', sequestration_factor: '500' },
    ];

    const afterRaw = parseCSV('Carbon_Sequestration_After_Wide.csv');
    const afterFiltered = vlcode ? afterRaw.filter(r => r.vlcode === vlcode) : afterRaw;
    const after: Record<string, string>[] = [];

    for (const row of afterFiltered) {
      for (const meta of AFTER_META) {
        if (meta.col in row) {
          after.push({
            vlcode:                      row.vlcode,
            village_name:                row.village_name,
            type:                        meta.type,
            intervention:                meta.intervention,
            area_added_ha:               meta.area_added_ha,
            sequestration_factor:        meta.sequestration_factor,
            annual_co2_sequestration_kg: row[meta.col] || '0',
          });
        }
      }
    }

    return NextResponse.json({ success: true, before, after });
  } catch (e) {
    console.error('[/api/sequestration]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
