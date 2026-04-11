import { NextResponse } from 'next/server';

import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { appendCSVRow, readCSV, updateCSVRow } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    filename: string;
  };
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    await getAdminSession();
    const decodedFilename = decodeURIComponent(params.filename);
    const csv = await readCSV(decodedFilename);

    return NextResponse.json({
      success: true,
      filename: csv.filename,
      headers: csv.headers,
      rows: csv.rows,
      rowCount: csv.rows.length,
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error(`[/api/admin/csv/${params.filename}] GET`, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to read CSV.' },
      { status: 400 }
    );
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    await getAdminSession();
    const decodedFilename = decodeURIComponent(params.filename);
    const body = await req.json();
    const row = body?.row;

    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return NextResponse.json({ success: false, error: 'A row object is required.' }, { status: 400 });
    }

    const csv = await appendCSVRow(decodedFilename, row);
    return NextResponse.json({
      success: true,
      filename: csv.filename,
      headers: csv.headers,
      rows: csv.rows,
      rowCount: csv.rows.length,
      message: 'Row added successfully.',
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error(`[/api/admin/csv/${params.filename}] POST`, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add row.' },
      { status: 400 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    await getAdminSession();
    const decodedFilename = decodeURIComponent(params.filename);
    const body = await req.json();
    const row = body?.row;
    const rowIndex = Number(body?.rowIndex);

    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return NextResponse.json({ success: false, error: 'A row object is required.' }, { status: 400 });
    }

    const csv = await updateCSVRow(decodedFilename, rowIndex, row);
    return NextResponse.json({
      success: true,
      filename: csv.filename,
      headers: csv.headers,
      rows: csv.rows,
      rowCount: csv.rows.length,
      message: 'Row updated successfully.',
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error(`[/api/admin/csv/${params.filename}] PUT`, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update row.' },
      { status: 400 }
    );
  }
}
