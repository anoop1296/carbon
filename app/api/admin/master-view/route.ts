import { NextResponse } from 'next/server';
import { getAdminSession, isAdminAuthError } from '@/lib/adminAuth';
import { listCSVFiles, readCSV, updateCSVRow, appendCSVRow, CsvRow } from '@/lib/csvParser';

export const dynamic = 'force-dynamic';

// Each merged column knows which source file it came from and its original column name
export interface MasterColumn {
  key: string;         // unique key in merged row: "filename::colname"
  file: string;        // source CSV filename
  col: string;         // original column name in that CSV
  label: string;       // display label
  isIdentity: boolean; // vlcode or village_name
}

// Returns merged rows (one per village) + column metadata
export async function GET() {
  try {
    await getAdminSession();

    const allFiles = await listCSVFiles();
    const csvData = await Promise.all(
      allFiles.map(async (filename) => {
        try {
          const csv = await readCSV(filename);
          return { filename, headers: csv.headers, rows: csv.rows };
        } catch {
          return null;
        }
      })
    );

    // Build column metadata — identity cols (vlcode, village_name) only appear once
    const columns: MasterColumn[] = [];
    const seenIdentity = new Set<string>();

    // First pass: add identity columns from Village.csv (master)
    const masterCsv = csvData.find(d => d?.filename === 'Village.csv');
    const pkCol   = masterCsv?.headers[0] ?? 'vlcode';
    const nameCol = masterCsv?.headers[1] ?? 'village_name';
    const IDENTITY = new Set([pkCol, nameCol]);

    columns.push({ key: `__id__::${pkCol}`,   file: 'Village.csv', col: pkCol,   label: pkCol,   isIdentity: true });
    columns.push({ key: `__id__::${nameCol}`,  file: 'Village.csv', col: nameCol, label: nameCol, isIdentity: true });
    seenIdentity.add(pkCol);
    seenIdentity.add(nameCol);

    // Second pass: add non-identity columns per file
    for (const d of csvData) {
      if (!d) continue;
      for (const col of d.headers) {
        if (seenIdentity.has(col)) continue; // skip identity cols
        const key = `${d.filename}::${col}`;
        columns.push({
          key,
          file: d.filename,
          col,
          label: col,
          isIdentity: false,
        });
      }
    }

    // Build merged rows — one per unique vlcode
    const villageMap = new Map<string, CsvRow>();

    // Seed from Village.csv first
    if (masterCsv) {
      for (const row of masterCsv.rows) {
        const pk = row[pkCol] || '';
        if (!pk) continue;
        const merged: CsvRow = {};
        for (const col of masterCsv.headers) {
          if (IDENTITY.has(col)) {
            merged[`__id__::${col}`] = row[col] || '';
          } else {
            merged[`${masterCsv.filename}::${col}`] = row[col] || '';
          }
        }
        villageMap.set(pk, merged);
      }
    }

    // Merge other files
    for (const d of csvData) {
      if (!d || d.filename === 'Village.csv') continue;
      const filePkCol   = d.headers[0] ?? pkCol;
      const fileNameCol = d.headers[1] ?? nameCol;
      const fileIdentity = new Set([filePkCol, fileNameCol]);

      for (const row of d.rows) {
        const pk = row[filePkCol] || '';
        if (!pk) continue;

        // Ensure the village exists in the map (may not be in Village.csv yet)
        if (!villageMap.has(pk)) {
          villageMap.set(pk, {
            [`__id__::${pkCol}`]:   row[filePkCol] || '',
            [`__id__::${nameCol}`]: row[fileNameCol] || '',
          });
        }

        const merged = villageMap.get(pk)!;
        for (const [col, val] of Object.entries(row)) {
          if (fileIdentity.has(col)) continue;
          merged[`${d.filename}::${col}`] = val || '';
        }
      }
    }

    const rows = Array.from(villageMap.values()).map(merged => {
      // Fill any missing keys with empty string
      const full: CsvRow = {};
      for (const colMeta of columns) {
        full[colMeta.key] = merged[colMeta.key] || '';
      }
      return full;
    });

    return NextResponse.json({ success: true, columns, rows });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[/api/admin/master-view] GET', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load master view.' },
      { status: 500 }
    );
  }
}

// PUT — update a single cell: { vlcode, colKey, value }
// Finds the right CSV row and updates the correct column
export async function PUT(req: Request) {
  try {
    await getAdminSession();

    const body = await req.json();
    const { vlcode, colKey, value } = body as { vlcode: string; colKey: string; value: string };

    if (!vlcode || !colKey) {
      return NextResponse.json({ success: false, error: 'vlcode and colKey are required.' }, { status: 400 });
    }

    // Parse colKey: "filename::colname" or "__id__::colname"
    const sep = colKey.indexOf('::');
    if (sep === -1) {
      return NextResponse.json({ success: false, error: 'Invalid colKey format.' }, { status: 400 });
    }
    const filename = colKey.slice(0, sep);
    const colName  = colKey.slice(sep + 2);

    // Identity cols always go to Village.csv
    const targetFile = filename === '__id__' ? 'Village.csv' : filename;

    const csv = await readCSV(targetFile);
    const pkCol   = csv.headers[0] ?? 'vlcode';
    const nameCol = csv.headers[1] ?? 'village_name';
    const rowIndex = csv.rows.findIndex(r => (r[pkCol] ?? '').trim() === vlcode.trim());

    if (rowIndex === -1) {
      // Village has no row in this file yet (e.g. a new village whose
      // Monthly_Activity_Wide row was never created). Create it so the edit
      // is persisted instead of being silently dropped.
      let villageName = '';
      try {
        const village = await readCSV('Village.csv');
        const vPk   = village.headers[0] ?? 'vlcode';
        const vName = village.headers[1] ?? 'village_name';
        villageName = (village.rows.find(r => (r[vPk] ?? '').trim() === vlcode.trim())?.[vName] ?? '').trim();
      } catch {
        // Village.csv missing or unreadable — fall back to empty name.
      }

      const newRow: CsvRow = { [pkCol]: vlcode, [nameCol]: villageName, [colName]: value };
      await appendCSVRow(targetFile, newRow);

      return NextResponse.json({ success: true, message: `Created row for "${vlcode}" and set ${colName} in ${targetFile}.` });
    }

    const updatedRow = { ...csv.rows[rowIndex], [colName]: value };
    await updateCSVRow(targetFile, rowIndex, updatedRow);

    return NextResponse.json({ success: true, message: `Updated ${colName} in ${targetFile}.` });
  } catch (error) {
    if (isAdminAuthError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('[/api/admin/master-view] PUT', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update.' },
      { status: 500 }
    );
  }
}
