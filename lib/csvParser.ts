import fs from 'fs';
import path from 'path';

import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';

export type CsvRow = Record<string, string>;

export const SEED_DATA_DIR = path.join(process.cwd(), 'data', 'csvSeed');
const CSV_COLLECTION = 'csvFiles';

function normalizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    throw new Error('CSV filename is required.');
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Nested paths are not allowed.');
  }

  if (!trimmed.toLowerCase().endsWith('.csv')) {
    throw new Error('Only .csv files are supported.');
  }

  return trimmed;
}

function resolveSeedCSVPath(filename: string): string {
  return path.join(SEED_DATA_DIR, normalizeFilename(filename));
}

function ensureFirestoreAvailable() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      'Firebase admin credentials are required. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }
}

function getCsvCollection() {
  ensureFirestoreAvailable();
  return getFirebaseAdminDb().collection(CSV_COLLECTION);
}

function parseCsvContent(raw: string): { headers: string[]; rows: CsvRow[] } {
  const input = raw.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') {
        i += 1;
      }

      currentRow.push(currentCell);
      const hasContent = currentRow.some((value) => value.trim() !== '');
      if (hasContent) {
        records.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += ch;
  }

  currentRow.push(currentCell);
  if (currentRow.some((value) => value.trim() !== '')) {
    records.push(currentRow);
  }

  if (!records.length) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map((header) => header.trim());
  const rows = records.slice(1).map((record) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = (record[index] ?? '').trim();
    });
    return row;
  });

  return { headers, rows };
}

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function upsertRowsByVlcode(existingRows: CsvRow[], newRows: CsvRow[], headers: string[]): CsvRow[] {
  // Use the first column as the primary key — no hardcoded field name
  const pkHeader = headers[0];
  if (!pkHeader) {
    return [...existingRows, ...newRows];
  }

  const result = existingRows.map((row) => ({ ...row }));
  for (const newRow of newRows) {
    const newPk = (newRow[pkHeader] ?? '').trim();
    if (!newPk) {
      result.push(normalizeRow(headers, newRow));
      continue;
    }

    const index = result.findIndex((row) => (row[pkHeader] ?? '').trim() === newPk);
    if (index >= 0) {
      result[index] = normalizeRow(headers, { ...result[index], ...newRow });
    } else {
      result.push(normalizeRow(headers, newRow));
    }
  }

  return result;
}

function normalizeRow(headers: string[], row: Record<string, unknown>): CsvRow {
  return headers.reduce<CsvRow>((acc, header) => {
    const raw = row[header];
    acc[header] = raw === null || raw === undefined ? '' : String(raw);
    return acc;
  }, {});
}

export function stringifyCSV(headers: string[], rows: Record<string, unknown>[]): string {
  if (!headers.length) {
    return '';
  }

  const headerLine = headers.map(escapeCsvValue).join(',');
  const body = rows.map((row) =>
    headers
      .map((header) => escapeCsvValue(row[header] === null || row[header] === undefined ? '' : String(row[header])))
      .join(',')
  );

  return [headerLine, ...body].join('\n');
}

function parseCsvFile(filename: string, raw: string) {
  const { headers, rows } = parseCsvContent(raw);
  return { filename, headers, rows };
}

function normalizeStoredContent(content: string) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized ? `${normalized.replace(/\n+$/, '')}\n` : '';
}

function listSeedCSVFiles(): string[] {
  if (!fs.existsSync(SEED_DATA_DIR)) {
    return [];
  }

  return fs
    .readdirSync(SEED_DATA_DIR)
    .filter((entry) => entry.toLowerCase().endsWith('.csv'))
    .sort((a, b) => a.localeCompare(b));
}

async function seedFirestoreCsv(filename: string) {
  const safeName = normalizeFilename(filename);
  const seedPath = resolveSeedCSVPath(safeName);

  if (!fs.existsSync(seedPath)) {
    throw new Error(`Dataset not found in Firestore: ${safeName}`);
  }

  const content = normalizeStoredContent(fs.readFileSync(seedPath, 'utf-8'));
  const parsed = parseCsvFile(safeName, content);

  await getCsvCollection().doc(safeName).set({
    filename: safeName,
    content,
    headers: parsed.headers,
    rows: parsed.rows,
    seededFrom: 'data/csvSeed',
    updatedAt: Date.now(),
  });

  return parsed;
}

async function bootstrapFirestoreFromSeedData() {
  const seedFiles = listSeedCSVFiles();
  if (!seedFiles.length) {
    return;
  }

  const collection = getCsvCollection();
  const snapshots = await Promise.all(seedFiles.map((filename) => collection.doc(filename).get()));

  await Promise.all(
    seedFiles.map(async (filename, index) => {
      if (snapshots[index]?.exists) {
        return;
      }

      await seedFirestoreCsv(filename);
    })
  );
}

async function readFirestoreCSV(filename: string) {
  const safeName = normalizeFilename(filename);
  const snapshot = await getCsvCollection().doc(safeName).get();

  if (!snapshot.exists) {
    return seedFirestoreCsv(safeName);
  }

  const content = snapshot.get('content');
  if (typeof content === 'string') {
    return parseCsvFile(safeName, content);
  }

  const headers = snapshot.get('headers');
  const rows = snapshot.get('rows');
  if (Array.isArray(headers) && Array.isArray(rows)) {
    const normalizedHeaders = headers.map((header) => String(header).trim()).filter(Boolean);
    const normalizedRows = rows.map((row) => normalizeRow(normalizedHeaders, row as Record<string, unknown>));
    return {
      filename: safeName,
      headers: normalizedHeaders,
      rows: normalizedRows,
    };
  }

  throw new Error(`Stored Firestore data is invalid for ${safeName}.`);
}

async function listFirestoreCSVFiles(): Promise<string[]> {
  await bootstrapFirestoreFromSeedData();
  const snapshot = await getCsvCollection().get();
  return snapshot.docs
    .map((doc) => doc.id)
    .filter((filename) => filename.toLowerCase().endsWith('.csv'))
    .sort((a, b) => a.localeCompare(b));
}

async function persistCSVContent(filename: string, content: string) {
  const safeName = normalizeFilename(filename);
  const normalizedContent = normalizeStoredContent(content);
  const parsed = parseCsvFile(safeName, normalizedContent);

  await getCsvCollection().doc(safeName).set({
    filename: safeName,
    content: normalizedContent,
    headers: parsed.headers,
    rows: parsed.rows,
    updatedAt: Date.now(),
  });
}

export async function parseCSV(filename: string): Promise<CsvRow[]> {
  const csv = await readCSV(filename);
  return csv.rows;
}

export async function readCSV(filename: string): Promise<{ filename: string; headers: string[]; rows: CsvRow[] }> {
  ensureFirestoreAvailable();
  return readFirestoreCSV(filename);
}

export async function listCSVFiles(): Promise<string[]> {
  ensureFirestoreAvailable();
  const [firestoreFiles, seedFiles] = await Promise.all([listFirestoreCSVFiles(), Promise.resolve(listSeedCSVFiles())]);
  return Array.from(new Set([...seedFiles, ...firestoreFiles])).sort((a, b) => a.localeCompare(b));
}

function collectHeaders(existingHeaders: string[], row: Record<string, unknown>): string[] {
  const appendedHeaders = Object.keys(row)
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && !existingHeaders.includes(key));

  return [...existingHeaders, ...appendedHeaders];
}

export async function writeCSV(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  if (!headers.length) {
    throw new Error('CSV must contain at least one header.');
  }

  const safeName = normalizeFilename(filename);
  const normalizedHeaders = headers.map((header) => header.trim()).filter(Boolean);
  const uniqueHeaders = Array.from(new Set(normalizedHeaders));

  if (!uniqueHeaders.length) {
    throw new Error('CSV must contain at least one valid header.');
  }

  const normalizedRows = rows.map((row) => normalizeRow(uniqueHeaders, row));
  const content = stringifyCSV(uniqueHeaders, normalizedRows);
  await persistCSVContent(safeName, content);

  return { filename: safeName, headers: uniqueHeaders, rows: normalizedRows };
}

export async function replaceCSV(filename: string, content: string) {
  const { headers, rows } = parseCsvContent(content);
  if (!headers.length) {
    throw new Error('Uploaded CSV is empty or missing headers.');
  }

  return writeCSV(filename, headers, rows);
}

export async function appendCSVRow(filename: string, row: Record<string, unknown>) {
  const current = await readCSV(filename);
  const headers = collectHeaders(current.headers, row);
  const rows = upsertRowsByVlcode(current.rows, [normalizeRow(headers, row)], headers);
  return writeCSV(filename, headers, rows);
}

export async function bulkAppendCSVRows(filename: string, uploadedContent: string) {
  const { headers: newHeaders, rows: newRows } = parseCsvContent(uploadedContent);

  if (!newHeaders.length) {
    throw new Error('Uploaded CSV is empty or missing headers.');
  }

  if (!newRows.length) {
    throw new Error('Uploaded CSV has headers but no data rows.');
  }

  let current: { filename: string; headers: string[]; rows: CsvRow[] };
  try {
    current = await readCSV(filename);
  } catch {
    return writeCSV(filename, newHeaders, newRows);
  }

  const mergedHeaders = Array.from(new Set([...current.headers, ...newHeaders]));
  const mergedRows = upsertRowsByVlcode(current.rows, newRows, mergedHeaders);
  return writeCSV(filename, mergedHeaders, mergedRows);
}

export async function updateCSVRow(filename: string, rowIndex: number, row: Record<string, unknown>) {
  const current = await readCSV(filename);

  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= current.rows.length) {
    throw new Error('Row index is out of range.');
  }

  const headers = collectHeaders(current.headers, row);
  const rows = current.rows.map((existingRow, index) =>
    index === rowIndex ? normalizeRow(headers, { ...existingRow, ...row }) : normalizeRow(headers, existingRow)
  );

  return writeCSV(filename, headers, rows);
}

export async function deleteCSVRow(filename: string, rowIndex: number) {
  const current = await readCSV(filename);

  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= current.rows.length) {
    throw new Error('Row index is out of range.');
  }

  const rows = current.rows
    .filter((_, index) => index !== rowIndex)
    .map((row) => normalizeRow(current.headers, row));

  return writeCSV(filename, current.headers, rows);
}
