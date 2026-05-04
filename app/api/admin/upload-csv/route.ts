import { NextResponse } from 'next/server';

import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { bulkAppendCSVRows } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/upload-csv
 * Body: multipart/form-data  { file: <csv file>, filename: <target filename> }
 *
 * Merges the uploaded CSV into the existing Firestore document:
 *   - New rows (by primary key = first column) are appended
 *   - Existing rows are updated (upsert by pk)
 *   - New columns in the uploaded file are added to all existing rows (empty for old rows)
 */
export async function POST(req: Request) {
  try {
    await getAdminSession();

    const formData = await req.formData();
    const file = formData.get('file');
    const targetFilename = formData.get('filename');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'A CSV file is required.' }, { status: 400 });
    }

    if (!targetFilename || typeof targetFilename !== 'string' || !targetFilename.trim()) {
      return NextResponse.json({ success: false, error: 'A target filename is required.' }, { status: 400 });
    }

    if (!targetFilename.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ success: false, error: 'Filename must end with .csv' }, { status: 400 });
    }

    const uploadedText = await (file as Blob).text();

    if (!uploadedText.trim()) {
      return NextResponse.json({ success: false, error: 'Uploaded file is empty.' }, { status: 400 });
    }

    const result = await bulkAppendCSVRows(targetFilename.trim(), uploadedText);

    return NextResponse.json({
      success: true,
      filename: result.filename,
      headers: result.headers,
      rows: result.rows,
      rowCount: result.rows.length,
      colCount: result.headers.length,
      message: `Merged successfully: ${result.rows.length} rows × ${result.headers.length} columns`,
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[/api/admin/upload-csv] POST', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upload CSV.' },
      { status: 400 }
    );
  }
}
