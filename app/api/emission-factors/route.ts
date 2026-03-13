// app/api/emission-factors/route.ts
// Emission_Factors.csv cols: category, emission_factor, source
// This CSV is already in the right format — no unpivoting needed.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

export async function GET() {
  try {
    const data = parseCSV('Emission_Factors.csv');
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/emission-factors]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
