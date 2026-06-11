import { NextResponse } from 'next/server';

import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { listCSVFiles, readCSV, writeCSV, upsertRowsByVlcode } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

function parseCsvText(raw: string): { headers: string[]; rows: Record<string, string>[] } {
  const text = raw.replace(/^﻿/, '');
  const lines: string[] = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; cur += ch; continue; }
    if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (cur.trim()) lines.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) lines.push(cur);

  if (lines.length < 2) return { headers: [], rows: [] };

  function splitRow(line: string): string[] {
    const cells: string[] = [];
    let cell = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { q = !q; continue; }
      if (c === ',' && !q) { cells.push(cell.trim()); cell = ''; }
      else cell += c;
    }
    cells.push(cell.trim());
    return cells;
  }

  const headers = splitRow(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = splitRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });

  return { headers, rows };
}

export async function POST(req: Request) {
  try {
    await getAdminSession();
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Please upload the filled master template CSV.' }, { status: 400 });
    }

    const content = await file.text();
    const { headers: masterHeaders, rows: masterRows } = parseCsvText(content);

    if (!masterHeaders.length) {
      return NextResponse.json({ success: false, error: 'Uploaded CSV is empty or missing headers.' }, { status: 400 });
    }
    if (!masterRows.length) {
      return NextResponse.json({ success: false, error: 'Uploaded CSV has no data rows.' }, { status: 400 });
    }

    // Monthly_Activity_Wide.csv is per-village, so it participates in distribution.
    // Only Emission_Factors.csv is truly global.
    const GLOBAL_FILES = new Set(['Emission_Factors.csv']);
    const allFiles = (await listCSVFiles()).filter(f => !GLOBAL_FILES.has(f));

    const results: { filename: string; addedRows: number }[] = [];
    const errors: { filename: string; error: string }[] = [];

    for (const filename of allFiles) {
      try {
        const current = await readCSV(filename);

        // Skip CSVs that share no meaningful columns with the master template
        const matchingHeaders = current.headers.filter((h) => masterHeaders.includes(h));

        // Need at least vlcode (or any 2+ matching columns) to distribute into this file
        if (matchingHeaders.length < 2) continue;

        // Only add rows where at least one non-shared column has data
        const SHARED = new Set(['vlcode', 'village_name']);
        const uniqueHeaders = matchingHeaders.filter((h) => !SHARED.has(h));

        const newRows = masterRows
          .filter((masterRow) => {
            // Must have some non-shared column with data for this file
            return uniqueHeaders.some((h) => (masterRow[h] ?? '').trim() !== '');
          })
          .map((masterRow) => {
            const row: Record<string, string> = {};
            current.headers.forEach((h) => {
              row[h] = masterRow[h] ?? '';
            });
            return row;
          });

        if (newRows.length === 0) continue;

        const upsertedRows = upsertRowsByVlcode(current.rows, newRows, current.headers);
        await writeCSV(filename, current.headers, upsertedRows);
        results.push({ filename, addedRows: newRows.length });
      } catch (err) {
        errors.push({ filename, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No matching columns found between the master template and existing CSV files. Make sure the headers match exactly.',
      }, { status: 400 });
    }

    const summary = results.map((r) => `${r.addedRows} row(s) → ${r.filename}`).join(', ');

    return NextResponse.json({
      success: true,
      results,
      errors,
      totalFiles: results.length,
      message: `Data distributed to ${results.length} file(s): ${summary}.`,
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[/api/admin/master-import]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to import master CSV.' },
      { status: 400 }
    );
  }
}
