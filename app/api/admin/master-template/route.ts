import { NextResponse } from 'next/server';
import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { listCSVFiles, readCSV, stringifyCSV } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

// Files that are global (not per-village) — excluded from the master template.
// Monthly_Activity_Wide.csv is per-village, so it stays in the template.
const GLOBAL_FILES = new Set(['Emission_Factors.csv']);

export async function GET() {
  try {
    await getAdminSession();

    const allFiles = await listCSVFiles();
    const villageFiles = allFiles.filter(f => !GLOBAL_FILES.has(f));

    const csvData = await Promise.all(
      villageFiles.map(async (filename) => {
        try {
          const csv = await readCSV(filename);
          return { filename, headers: csv.headers, rows: csv.rows };
        } catch {
          return null;
        }
      })
    );

    // Determine pk/name from Village.csv
    const masterCsv = csvData.find(d => d?.filename === 'Village.csv');
    const pkCol   = masterCsv?.headers[0] ?? 'vlcode';
    const nameCol = masterCsv?.headers[1] ?? 'village_name';

    // Build flat header list: identity first, then all unique non-identity cols from each file
    const headers: string[] = [pkCol, nameCol];
    const seenCols = new Set<string>([pkCol, nameCol]);

    for (const d of csvData) {
      if (!d) continue;
      for (const col of d.headers) {
        if (seenCols.has(col)) continue;
        headers.push(col);
        seenCols.add(col);
      }
    }

    // Build one row per village — gather all data from all files merged by vlcode
    const villageMap = new Map<string, Record<string, string>>();

    for (const d of csvData) {
      if (!d) continue;
      const filePkCol   = d.headers[0] ?? pkCol;
      const fileNameCol = d.headers[1] ?? nameCol;
      const fileIdentity = new Set([filePkCol, fileNameCol]);

      for (const row of d.rows) {
        const pk = (row[filePkCol] || '').trim();
        if (!pk) continue;

        if (!villageMap.has(pk)) {
          villageMap.set(pk, { [pkCol]: row[filePkCol] || '', [nameCol]: row[fileNameCol] || '' });
        }
        const merged = villageMap.get(pk)!;
        for (const [col, val] of Object.entries(row)) {
          if (fileIdentity.has(col)) continue;
          merged[col] = val || '';
        }
      }
    }

    // If no villages exist yet, return a template with one empty row
    const rows = villageMap.size > 0
      ? Array.from(villageMap.values()).map(r => {
          const full: Record<string, string> = {};
          headers.forEach(h => { full[h] = r[h] || ''; });
          return full;
        })
      : [headers.reduce<Record<string, string>>((acc, h) => { acc[h] = ''; return acc; }, {})];

    const csv = stringifyCSV(headers, rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="master_template.csv"',
      },
    });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[/api/admin/master-template]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate template.' },
      { status: 500 }
    );
  }
}
