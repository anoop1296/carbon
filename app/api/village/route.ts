// app/api/village/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { parseCSV } from '@/lib/csvParser';

export async function GET() {
  try {
    const data = parseCSV('Village.csv');
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[/api/village]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
