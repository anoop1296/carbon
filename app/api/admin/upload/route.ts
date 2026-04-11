import { NextResponse } from 'next/server';

import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { replaceCSV } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await getAdminSession();
    const formData = await req.formData();
    const file = formData.get('file');
    const requestedName = formData.get('filename');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Please choose a CSV file.' }, { status: 400 });
    }

    const filename = typeof requestedName === 'string' && requestedName.trim() ? requestedName : file.name;
    const content = await file.text();
    const csv = await replaceCSV(filename, content);

    return NextResponse.json({
      success: true,
      filename: csv.filename,
      headers: csv.headers,
      rowCount: csv.rows.length,
      message: `${csv.filename} uploaded successfully.`,
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[/api/admin/upload]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upload CSV.' },
      { status: 400 }
    );
  }
}
