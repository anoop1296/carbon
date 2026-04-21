import { NextResponse } from 'next/server';

import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { bulkAppendCSVRows, replaceCSV } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await getAdminSession();
    const formData = await req.formData();
    const file = formData.get('file');
    const requestedName = formData.get('filename');
    const mode = (formData.get('mode') as string) || 'append';

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Please choose a CSV file.' }, { status: 400 });
    }

    const filename =
      typeof requestedName === 'string' && requestedName.trim() ? requestedName.trim() : file.name;

    const content = await file.text();

    if (mode === 'replace') {
      const csv = await replaceCSV(filename, content);
      return NextResponse.json({
        success: true,
        filename: csv.filename,
        rowCount: csv.rows.length,
        addedRows: csv.rows.length,
        message: `${csv.filename} replaced with ${csv.rows.length} rows.`,
      });
    }

    const csv = await bulkAppendCSVRows(filename, content);
    const addedRows = csv.rows.length;
    return NextResponse.json({
      success: true,
      filename: csv.filename,
      rowCount: csv.rows.length,
      addedRows,
      message: `${addedRows} rows appended to ${csv.filename} (total: ${csv.rows.length}).`,
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[/api/admin/bulk-import]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to bulk import CSV.' },
      { status: 400 }
    );
  }
}
