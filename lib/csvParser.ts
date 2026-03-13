// lib/csvParser.ts
import fs from 'fs';
import path from 'path';

// CSV files live in public/Clean2/
const DATA_DIR = path.join(process.cwd(), 'public', 'Clean2');

export function parseCSV(filename: string): Record<string, string>[] {
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `CSV not found: ${filePath}\nAvailable in ${DATA_DIR}: ${
        fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).join(', ') : '(directory missing)'
      }`
    );
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    values.push(current.trim());

    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').replace(/^"|"$/g, ''); });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== ''));
}