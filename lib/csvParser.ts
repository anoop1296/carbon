import fs from 'fs';
import path from 'path';

export type CsvRow = Record<string, string>;

export const DATA_DIR = path.join(process.cwd(), 'public', 'Clean2');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

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

export function resolveCSVPath(filename: string): string {
  ensureDataDir();
  return path.join(DATA_DIR, normalizeFilename(filename));
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

export function parseCSV(filename: string): CsvRow[] {
  return readCSV(filename).rows;
}

export function readCSV(filename: string): { filename: string; headers: string[]; rows: CsvRow[] } {
  const safeName = normalizeFilename(filename);
  const filePath = resolveCSVPath(safeName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV not found: ${safeName}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { headers, rows } = parseCsvContent(raw);
  return { filename: safeName, headers, rows };
}

export function listCSVFiles(): string[] {
  ensureDataDir();

  return fs
    .readdirSync(DATA_DIR)
    .filter((entry) => entry.toLowerCase().endsWith('.csv'))
    .sort((a, b) => a.localeCompare(b));
}

function collectHeaders(existingHeaders: string[], row: Record<string, unknown>): string[] {
  const appendedHeaders = Object.keys(row)
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && !existingHeaders.includes(key));

  return [...existingHeaders, ...appendedHeaders];
}

export function writeCSV(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  if (!headers.length) {
    throw new Error('CSV must contain at least one header.');
  }

  const safeName = normalizeFilename(filename);
  const filePath = resolveCSVPath(safeName);
  const normalizedHeaders = headers.map((header) => header.trim()).filter(Boolean);
  const uniqueHeaders = Array.from(new Set(normalizedHeaders));

  if (!uniqueHeaders.length) {
    throw new Error('CSV must contain at least one valid header.');
  }

  const normalizedRows = rows.map((row) => normalizeRow(uniqueHeaders, row));
  const content = stringifyCSV(uniqueHeaders, normalizedRows);
  fs.writeFileSync(filePath, content ? `${content}\n` : '', 'utf-8');

  return { filename: safeName, headers: uniqueHeaders, rows: normalizedRows };
}

export function replaceCSV(filename: string, content: string) {
  const { headers, rows } = parseCsvContent(content);
  if (!headers.length) {
    throw new Error('Uploaded CSV is empty or missing headers.');
  }

  return writeCSV(filename, headers, rows);
}

export function appendCSVRow(filename: string, row: Record<string, unknown>) {
  const current = readCSV(filename);
  const headers = collectHeaders(current.headers, row);
  const rows = [...current.rows, normalizeRow(headers, row)];
  return writeCSV(filename, headers, rows);
}

export function updateCSVRow(filename: string, rowIndex: number, row: Record<string, unknown>) {
  const current = readCSV(filename);

  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= current.rows.length) {
    throw new Error('Row index is out of range.');
  }

  const headers = collectHeaders(current.headers, row);
  const rows = current.rows.map((existingRow, index) =>
    index === rowIndex ? normalizeRow(headers, { ...existingRow, ...row }) : normalizeRow(headers, existingRow)
  );

  return writeCSV(filename, headers, rows);
}
