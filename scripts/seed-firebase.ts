/**
 * One-shot script: uploads every CSV from csvSeed/ into Firestore.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-firebase.ts
 *
 * Behaviour:
 *   - Reads each *.csv file from the csvSeed/ directory
 *   - Parses headers + rows
 *   - Writes to Firestore collection `csvFiles` using the filename as the document ID
 *   - Existing documents are OVERWRITTEN (re-seed is safe to run multiple times)
 */

import fs from 'fs';
import path from 'path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── env ───────────────────────────────────────────────────────────────────────
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error(
    '\nMissing Firebase admin credentials.\n' +
    'Run with: npx tsx --env-file=.env.local scripts/seed-firebase.ts\n'
  );
  process.exit(1);
}

// ── firebase init ─────────────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({ credential: cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }) });
}
const db = getFirestore();

// ── csv parser ────────────────────────────────────────────────────────────────
type CsvRow = Record<string, string>;

function parseCsvContent(raw: string): { headers: string[]; rows: CsvRow[] } {
  const input = raw.replace(/^﻿/, '');
  const records: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { currentCell += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { currentRow.push(currentCell); currentCell = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      currentRow.push(currentCell);
      if (currentRow.some((v) => v.trim())) records.push(currentRow);
      currentRow = []; currentCell = '';
      continue;
    }
    currentCell += ch;
  }
  currentRow.push(currentCell);
  if (currentRow.some((v) => v.trim())) records.push(currentRow);

  if (!records.length) return { headers: [], rows: [] };

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1).map((rec) => {
    const row: CsvRow = {};
    headers.forEach((h, i) => { row[h] = (rec[i] ?? '').trim(); });
    return row;
  });
  return { headers, rows };
}

function normalizeContent(content: string) {
  const n = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return n ? `${n.replace(/\n+$/, '')}\n` : '';
}

// ── seed ──────────────────────────────────────────────────────────────────────
const SEED_DIR = path.join(process.cwd(), 'csvSeed');
const CSV_COLLECTION = 'csvFiles';

async function seedAll() {
  if (!fs.existsSync(SEED_DIR)) {
    console.error(`csvSeed/ directory not found at: ${SEED_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SEED_DIR).filter((f) => f.toLowerCase().endsWith('.csv')).sort();

  if (!files.length) {
    console.log('No CSV files found in csvSeed/.');
    return;
  }

  console.log(`\nSeeding ${files.length} CSV file(s) to Firestore project "${PROJECT_ID}"...\n`);

  const collection = db.collection(CSV_COLLECTION);

  for (const filename of files) {
    const filePath = path.join(SEED_DIR, filename);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const content = normalizeContent(rawContent);
    const { headers, rows } = parseCsvContent(content);

    if (!headers.length) {
      console.warn(`  [SKIP] ${filename} — empty or no headers`);
      continue;
    }

    await collection.doc(filename).set({
      filename,
      content,
      headers,
      rows,
      seededFrom: 'scripts/seed-firebase.ts',
      updatedAt: Date.now(),
    });

    console.log(`  [OK]   ${filename.padEnd(42)} ${rows.length} rows  ×  ${headers.length} cols`);
  }

  console.log('\nAll CSVs uploaded to Firestore successfully.\n');
}

seedAll().catch((err) => {
  console.error('\nSeed failed:', err.message || err);
  process.exit(1);
});
