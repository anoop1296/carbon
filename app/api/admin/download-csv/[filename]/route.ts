import { NextResponse } from 'next/server';
import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { readCSV, stringifyCSV } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { filename: string } };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    await getAdminSession();

    const filename = decodeURIComponent(params.filename);
    const csv = await readCSV(filename);
    const content = stringifyCSV(csv.headers, csv.rows);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[/api/admin/download-csv]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to download.' },
      { status: 500 }
    );
  }
}
