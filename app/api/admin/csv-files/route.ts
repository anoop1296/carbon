import { NextResponse } from 'next/server';

import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { listCSVFiles } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getAdminSession();
    const files = await listCSVFiles();
    return NextResponse.json({ success: true, files });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[/api/admin/csv-files]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list CSV files.' },
      { status: 500 }
    );
  }
}
