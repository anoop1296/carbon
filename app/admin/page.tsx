'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';

import { getFirebaseClientAuth } from '@/lib/firebaseClient';

type CsvRow = Record<string, string>;

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  vlcode: 'Unique 6-digit village code (e.g. 200001). Must match Village.csv.',
  village_name: 'Full name of the village as registered.',
  district: 'District the village belongs to.',
  state: 'State the village belongs to.',
  total_population: 'Total resident population count.',
  total_area_ha: 'Total land area in hectares.',
  builtup_area_ha: 'Built-up / settlement area in hectares.',
  agricultural_area_ha: 'Agricultural land area in hectares.',
  water_bodies_area_ha: 'Water bodies area in hectares.',
  total_households: 'Total number of households.',
  total_livestock: 'Total livestock animal count.',
  total_vehicles: 'Total registered vehicles.',
  category: 'Emission factor category name.',
  emission_factor: 'Emission factor value with units (e.g. 1.77 kg CO2/unit).',
  source: 'Data source reference (e.g. IPCC 2006).',
};

function getColumnDescription(header: string): string {
  if (COLUMN_DESCRIPTIONS[header]) return COLUMN_DESCRIPTIONS[header];
  const lower = header.toLowerCase();
  if (lower.startsWith('agriculture_')) return 'Agricultural activity quantity (kg/tonnes).';
  if (lower.startsWith('livestock_')) return 'Livestock-related emission or activity value.';
  if (lower.startsWith('residential_') || lower.includes('firewood') || lower.includes('lpg')) return 'Household energy consumption quantity.';
  if (lower.startsWith('transport_') || lower.includes('petrol') || lower.includes('diesel')) return 'Transport fuel consumption in litres.';
  if (lower.startsWith('energy_') || lower.includes('electricity') || lower.endsWith('_kwh')) return 'Energy in kWh.';
  if (lower.startsWith('waste_') || lower.includes('waste')) return 'Waste quantity in kg.';
  if (lower.endsWith('_ha') || lower.includes('area')) return 'Area in hectares.';
  if (lower.endsWith('_kg')) return 'Quantity in kilograms.';
  if (lower.endsWith('_litres') || lower.endsWith('_litre')) return 'Volume in litres.';
  if (lower.endsWith('_count')) return 'Count / numeric quantity.';
  if (lower.includes('sequestration')) return 'Carbon sequestration (tCO2e).';
  if (lower.includes('emission')) return 'Emission amount (kg CO2e or tCO2e).';
  if (lower.includes('budget')) return 'Carbon budget value.';
  if (lower.includes('projection') || lower.includes('scenario')) return 'Scenario projection value.';
  if (lower.includes('month')) return 'Month name or number (1–12).';
  if (lower.includes('year')) return 'Year (e.g. 2023).';
  return 'Data value for this column.';
}

function generateSampleValue(header: string): string {
  const lower = header.toLowerCase();
  if (lower === 'vlcode') return '200001';
  if (lower === 'village_name') return 'Sample Village';
  if (lower === 'district') return 'Sample District';
  if (lower === 'state') return 'Uttar Pradesh';
  if (lower === 'category') return 'Sample Category';
  if (lower === 'emission_factor') return '1.5 kg CO2/unit';
  if (lower === 'source') return 'IPCC 2006';
  if (lower.includes('population')) return '1500';
  if (lower.includes('household')) return '200';
  if (lower.includes('livestock')) return '400';
  if (lower.includes('vehicle')) return '100';
  if (lower.endsWith('_ha') || lower.includes('area')) return '150';
  if (lower.endsWith('_kwh') || lower.includes('electricity')) return '25000';
  if (lower.endsWith('_kg') || lower.includes('firewood')) return '5000';
  if (lower.endsWith('_litres') || lower.includes('petrol') || lower.includes('diesel')) return '1200';
  if (lower.endsWith('_count')) return '50';
  if (lower.includes('month')) return '1';
  if (lower.includes('year')) return '2023';
  return '0';
}

function escapeCsvValueClient(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

type CsvData = {
  filename: string;
  headers: string[];
  rows: CsvRow[];
  rowCount: number;
};

const MASTER_VILLAGE_FILE = 'Village.csv';
const VILLAGE_CODE_FIELD = 'vlcode';
const VILLAGE_NAME_FIELD = 'village_name';

function createEmptyRow(headers: string[]): CsvRow {
  return headers.reduce<CsvRow>((acc, header) => {
    acc[header] = '';
    return acc;
  }, {});
}

function needsVillageContext(filename: string, headers: string[]) {
  if (filename === MASTER_VILLAGE_FILE) {
    return false;
  }

  return headers.includes(VILLAGE_CODE_FIELD) || headers.includes(VILLAGE_NAME_FIELD);
}

function applyVillageFields(row: CsvRow, headers: string[], village: CsvRow | null) {
  if (!village) {
    return row;
  }

  const nextRow = { ...row };
  if (headers.includes(VILLAGE_CODE_FIELD)) {
    nextRow[VILLAGE_CODE_FIELD] = village[VILLAGE_CODE_FIELD] || '';
  }
  if (headers.includes(VILLAGE_NAME_FIELD)) {
    nextRow[VILLAGE_NAME_FIELD] = village[VILLAGE_NAME_FIELD] || '';
  }

  return nextRow;
}

function normalizeAdminErrorMessage(message: string) {
  const text = message.trim();

  if (/read-only file system|EROFS/i.test(text)) {
    return 'Vercel deployment cannot write directly to public CSV files. Use Firestore/cloud storage mode for hosted updates, then try again.';
  }

  if (/Cloud Firestore API has not been used|firestore\.googleapis\.com|PERMISSION_DENIED/i.test(text)) {
    return 'Cloud Firestore is not enabled for this Firebase project yet. Open Firebase Console, create Firestore Database, wait 2-5 minutes, and try again.';
  }

  if (/Missing Firebase admin environment variable/i.test(text)) {
    return 'Firebase admin environment variables are missing on this deployment. Add the Firebase server credentials in Vercel and redeploy.';
  }

  return text;
}

export default function AdminPage() {
  const router = useRouter();
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [villageRows, setVillageRows] = useState<CsvRow[]>([]);
  const [selectedVillageCode, setSelectedVillageCode] = useState('');
  const [editableHeaders, setEditableHeaders] = useState<string[]>([]);
  const [formData, setFormData] = useState<CsvRow>({});
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [allFileHeaders, setAllFileHeaders] = useState<Record<string, string[]>>({});
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingRow, setDeletingRow] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [showFormatInfo, setShowFormatInfo] = useState(false);

  const selectedVillage =
    villageRows.find((row) => row.vlcode === selectedVillageCode) || villageRows[0] || null;
  const isVillageFile = selectedFile === MASTER_VILLAGE_FILE;
  const requiresVillage = needsVillageContext(selectedFile, editableHeaders);
  const villageLocked = requiresVillage && villageRows.length === 0;
  const saveDisabled =
    saving || editableHeaders.length === 0 || (requiresVillage && !selectedVillage);

  async function loadVillageMaster(preferredVillageCode?: string) {
    try {
      const res = await fetch(`/api/admin/csv/${encodeURIComponent(MASTER_VILLAGE_FILE)}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load village master.');
      }

      const rows = (data.rows || []) as CsvRow[];
      setVillageRows(rows);

      const nextVillageCode =
        preferredVillageCode && rows.some((row) => row.vlcode === preferredVillageCode)
          ? preferredVillageCode
          : rows[0]?.vlcode || '';

      setSelectedVillageCode(nextVillageCode);
    } catch {
      setVillageRows([]);
      setSelectedVillageCode('');
    }
  }

  async function loadFiles(preferredFile?: string) {
    setLoadingFiles(true);
    setError('');

    try {
      const res = await fetch('/api/admin/csv-files', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load CSV files.');
      }

      const rawFiles = data.files as string[];
      const nextFiles = rawFiles.includes(MASTER_VILLAGE_FILE)
        ? [MASTER_VILLAGE_FILE, ...rawFiles.filter((file) => file !== MASTER_VILLAGE_FILE)]
        : rawFiles;
      setFiles(nextFiles);

      const nextSelected = preferredFile && nextFiles.includes(preferredFile)
        ? preferredFile
        : nextFiles.includes(MASTER_VILLAGE_FILE)
          ? MASTER_VILLAGE_FILE
          : nextFiles[0] || '';

      setSelectedFile(nextSelected);

      // Pre-load headers for all files (for master template generation)
      const headerMap: Record<string, string[]> = {};
      await Promise.all(
        nextFiles.map(async (file) => {
          try {
            const r = await fetch(`/api/admin/csv/${encodeURIComponent(file)}`, { cache: 'no-store' });
            const d = await r.json();
            if (r.ok && d.success) headerMap[file] = d.headers as string[];
          } catch {
            // skip
          }
        })
      );
      setAllFileHeaders(headerMap);
    } catch (err) {
      showAdminError(err instanceof Error ? err.message : 'Failed to load CSV files.');
      setFiles([]);
      setSelectedFile('');
    } finally {
      setLoadingFiles(false);
    }
  }

  async function loadCsv(filename: string) {
    if (!filename) {
      setCsvData(null);
      setEditableHeaders([]);
      setFormData({});
      return;
    }

    setLoadingCsv(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/csv/${encodeURIComponent(filename)}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load CSV data.');
      }

      const nextCsvData: CsvData = {
        filename: data.filename,
        headers: data.headers,
        rows: data.rows,
        rowCount: data.rowCount,
      };

      setCsvData(nextCsvData);
      setEditableHeaders(nextCsvData.headers);
      setFormData(createEmptyRow(nextCsvData.headers));
      setEditingRowIndex(null);
    } catch (err) {
      showAdminError(err instanceof Error ? err.message : 'Failed to load CSV data.');
      setCsvData(null);
      setEditableHeaders([]);
      setFormData({});
    } finally {
      setLoadingCsv(false);
    }
  }

  useEffect(() => {
    fetch('/api/admin/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          router.replace('/admin/login');
          return;
        }

        setAdminEmail(data.user?.email || '');
        await loadFiles();
        await loadVillageMaster();
        setCheckingAuth(false);
      })
      .catch(() => {
        router.replace('/admin/login');
      });
  }, [router]);

  useEffect(() => {
    loadCsv(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile || isVillageFile || !requiresVillage || !selectedVillage) {
      return;
    }

    setFormData((current) => applyVillageFields(current, editableHeaders, selectedVillage));
  }, [editableHeaders, isVillageFile, requiresVillage, selectedFile, selectedVillage]);

  useEffect(() => {
    if (!selectedFile || !files.includes(MASTER_VILLAGE_FILE)) {
      return;
    }

    if (selectedFile !== MASTER_VILLAGE_FILE && villageRows.length === 0) {
      setSelectedFile(MASTER_VILLAGE_FILE);
    }
  }, [files, selectedFile, villageRows.length]);

  useEffect(() => {
    if (!error) {
      setShowErrorPopup(false);
      return;
    }

    setShowErrorPopup(true);
    const timer = window.setTimeout(() => {
      setShowErrorPopup(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [error]);

  function showAdminError(rawMessage: string) {
    setMessage('');
    setError(normalizeAdminErrorMessage(rawMessage));
  }

  function resetForm(headers = editableHeaders) {
    setFormData(applyVillageFields(createEmptyRow(headers), headers, selectedVillage));
    setEditingRowIndex(null);
    setNewColumnName('');
  }

  function handleFieldChange(header: string, value: string) {
    setFormData((current) => ({
      ...current,
      [header]: value,
    }));
  }

  function handleAddColumn() {
    const header = newColumnName.trim();
    if (!header) {
      return;
    }

    if (editableHeaders.includes(header)) {
      showAdminError(`Column "${header}" already exists.`);
      return;
    }

    const nextHeaders = [...editableHeaders, header];
    setEditableHeaders(nextHeaders);
    setFormData((current) => ({
      ...current,
      [header]: '',
    }));
    setNewColumnName('');
    setError('');
  }

  async function handleSaveRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      showAdminError('Please select a CSV file first.');
      return;
    }

    if (requiresVillage && !selectedVillage) {
      showAdminError('Please create or select a village in Village.csv first.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const payloadRow = editableHeaders.reduce<CsvRow>((acc, header) => {
      acc[header] = formData[header] || '';
      return acc;
    }, {});
    const finalPayload = requiresVillage
      ? applyVillageFields(payloadRow, editableHeaders, selectedVillage)
      : payloadRow;

    try {
      const res = await fetch(`/api/admin/csv/${encodeURIComponent(selectedFile)}`, {
        method: editingRowIndex === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingRowIndex === null
            ? { row: finalPayload }
            : { rowIndex: editingRowIndex, row: finalPayload }
        ),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save row.');
      }

      setMessage(data.message || 'CSV updated successfully.');
      await loadCsv(selectedFile);
      await loadVillageMaster(
        selectedFile === MASTER_VILLAGE_FILE
          ? finalPayload[VILLAGE_CODE_FIELD]
          : selectedVillage?.[VILLAGE_CODE_FIELD]
      );
    } catch (err) {
      showAdminError(err instanceof Error ? err.message : 'Failed to save row.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRow() {
    if (!selectedFile) {
      showAdminError('Please select a CSV file first.');
      return;
    }

    if (editingRowIndex === null) {
      showAdminError('Select a row to delete first.');
      return;
    }

    const confirmed = window.confirm(
      `Delete row ${editingRowIndex + 1} from ${selectedFile}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingRow(true);
    setError('');
    setMessage('');

    const deletedRow = csvData?.rows?.[editingRowIndex] || null;

    try {
      const res = await fetch(`/api/admin/csv/${encodeURIComponent(selectedFile)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: editingRowIndex }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete row.');
      }

      resetForm();
      setMessage(data.message || 'Row deleted successfully.');
      await loadCsv(selectedFile);
      await loadVillageMaster(
        selectedFile === MASTER_VILLAGE_FILE
          ? selectedVillage?.[VILLAGE_CODE_FIELD]
          : deletedRow?.[VILLAGE_CODE_FIELD] || selectedVillage?.[VILLAGE_CODE_FIELD]
      );
    } catch (err) {
      showAdminError(err instanceof Error ? err.message : 'Failed to delete row.');
    } finally {
      setDeletingRow(false);
    }
  }

  function beginEditRow(row: CsvRow, rowIndex: number) {
    const nextHeaders = Array.from(new Set([...editableHeaders, ...Object.keys(row)]));
    setEditableHeaders(nextHeaders);
    const matchedVillage =
      row[VILLAGE_CODE_FIELD] && villageRows.some((village) => village.vlcode === row[VILLAGE_CODE_FIELD])
        ? row[VILLAGE_CODE_FIELD]
        : selectedVillage?.[VILLAGE_CODE_FIELD] || villageRows[0]?.[VILLAGE_CODE_FIELD] || '';

    if (!isVillageFile && matchedVillage) {
      setSelectedVillageCode(matchedVillage);
    }

    setFormData(
      applyVillageFields(
        nextHeaders.reduce<CsvRow>((acc, header) => {
          acc[header] = row[header] || '';
          return acc;
        }, {}),
        nextHeaders,
        !isVillageFile && matchedVillage
          ? villageRows.find((village) => village.vlcode === matchedVillage) || selectedVillage
          : null
      )
    );
    setEditingRowIndex(rowIndex);
    setMessage(`Editing row ${rowIndex + 1} in ${selectedFile}.`);
    setError('');
  }

  const previewRows = csvData?.rows || [];

  async function handleLogout() {
    setLoggingOut(true);
    setError('');

    try {
      await fetch('/api/admin/auth/session', {
        method: 'DELETE',
      });
      await signOut(getFirebaseClientAuth());
    } catch {
      // Best effort logout on both client and server.
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  function downloadMasterTemplate() {
    const fileOrder = [
      MASTER_VILLAGE_FILE,
      ...Object.keys(allFileHeaders).filter((f) => f !== MASTER_VILLAGE_FILE),
    ];

    const seen = new Set<string>();
    const masterHeaders: string[] = [];

    // Always vlcode + village_name first
    ['vlcode', 'village_name'].forEach((h) => { if (!seen.has(h)) { seen.add(h); masterHeaders.push(h); } });

    // Then all unique columns from every CSV file in order
    fileOrder.forEach((file) => {
      (allFileHeaders[file] || []).forEach((h) => {
        if (!seen.has(h)) { seen.add(h); masterHeaders.push(h); }
      });
    });

    if (!masterHeaders.length) {
      showAdminError('No CSV files loaded yet. Wait for the page to finish loading.');
      return;
    }

    const headerRow = masterHeaders.map(escapeCsvValueClient).join(',');
    const sampleRow = masterHeaders.map(generateSampleValue).map(escapeCsvValueClient).join(',');
    const csvContent = `${headerRow}\n${sampleRow}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'master_template_all_csvs.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleMasterImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bulkFile) {
      showAdminError('Please choose the filled master template CSV to import.');
      return;
    }

    setBulkImporting(true);
    setError('');
    setMessage('');

    try {
      const fd = new FormData();
      fd.append('file', bulkFile);

      const res = await fetch('/api/admin/master-import', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import master CSV.');
      }

      setMessage(data.message || 'Master import completed.');
      setBulkFile(null);
      await loadFiles(selectedFile);
      await loadCsv(selectedFile);
      await loadVillageMaster(selectedVillage?.[VILLAGE_CODE_FIELD]);
    } catch (err) {
      showAdminError(err instanceof Error ? err.message : 'Failed to import master CSV.');
    } finally {
      setBulkImporting(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(180deg,_#f4fbf7_0%,_#eef5f1_45%,_#ffffff_100%)] px-4 text-slate-900">
        <div className="rounded-[28px] border border-emerald-100 bg-white/90 px-8 py-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          Verifying admin access...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(180deg,_#f4fbf7_0%,_#eef5f1_45%,_#ffffff_100%)] text-slate-900">
      {showErrorPopup && error && (
        <div className="fixed right-4 top-4 z-[100] w-full max-w-md rounded-3xl border border-red-200 bg-white p-4 shadow-[0_24px_70px_rgba(220,38,38,0.18)]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-lg font-bold text-red-600">
              !
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
                Error
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-700">{error}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorPopup(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-600"
              aria-label="Close error popup"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Top header bar ── */}
        <header className="rounded-2xl border border-emerald-100 bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">CSV Admin Panel</h1>
                {adminEmail && <p className="text-xs text-slate-400">{adminEmail}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
                Dashboard
              </Link>
              <Link href="/"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
                Home
              </Link>
              <button type="button" onClick={handleLogout} disabled={loggingOut}
                className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60">
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">

            {/* ── Available CSVs ── */}
            <section className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700">Available CSVs</h2>
                <button type="button" onClick={() => loadFiles(selectedFile)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-emerald-200 hover:text-emerald-600">
                  Refresh
                </button>
              </div>

              <select
                value={selectedFile}
                onChange={(event) => setSelectedFile(event.target.value)}
                disabled={loadingFiles || files.length === 0}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                {files.length === 0 && <option value="">No CSV files found</option>}
                {files.map((file) => (
                  <option key={file} value={file} disabled={file !== MASTER_VILLAGE_FILE && villageRows.length === 0}>
                    {file}
                  </option>
                ))}
              </select>

              {villageRows.length === 0 && files.includes(MASTER_VILLAGE_FILE) && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  Fill <span className="font-semibold">Village.csv</span> first to unlock other files.
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Files</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{loadingFiles ? '…' : files.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Rows</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{loadingCsv ? '…' : csvData?.rowCount ?? 0}</p>
                </div>
              </div>

              {/* Current file column badges */}
              {editableHeaders.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Columns in {selectedFile}</p>
                  <div className="flex flex-wrap gap-1">
                    {editableHeaders.map((h) => (
                      <span key={h} className="rounded-md border border-emerald-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── Master Import ── */}
            <section className="rounded-2xl border border-violet-100 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                    Master Import
                  </div>
                  <h2 className="mt-1.5 text-sm font-bold text-slate-900">One Template — All CSV Files</h2>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Download one master template that contains <span className="font-semibold">every column</span> from all your CSV files. Fill it once, upload once — data goes into the right file automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormatInfo((v) => !v)}
                  aria-label="How it works"
                  title="How it works"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-xs font-bold italic text-sky-600 transition hover:bg-sky-100"
                >
                  i
                </button>
              </div>

              {showFormatInfo && (
                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3">
                  <p className="text-xs font-semibold text-sky-900">How it works</p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11px] leading-5 text-slate-600">
                    <li>Click <span className="font-semibold">Download Master Template</span>.</li>
                    <li>Open in Excel / Google Sheets. Each row = one village. Fill all columns you have data for — leave others blank.</li>
                    <li>Save as <code>.csv</code> and upload below.</li>
                    <li>The system reads each row and automatically puts the right columns into the right CSV file — Village.csv, Annual Emissions, Monthly Activity, Carbon Budget, etc.</li>
                  </ol>
                  {Object.keys(allFileHeaders).length > 0 && (
                    <div className="mt-3 border-t border-sky-200 pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-800">Files included in master template</p>
                      <div className="mt-1.5 space-y-1">
                        {Object.entries(allFileHeaders).map(([file, headers]) => (
                          <div key={file} className="rounded-lg bg-white/80 px-2.5 py-1.5">
                            <p className="text-[10px] font-semibold text-violet-700">{file}</p>
                            <p className="mt-0.5 text-[10px] leading-4 text-slate-500 break-words">{headers.join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1 */}
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">1</span>
                <span className="text-xs font-semibold text-slate-700">Download the master template</span>
              </div>
              <button
                type="button"
                onClick={downloadMasterTemplate}
                disabled={Object.keys(allFileHeaders).length === 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                <span className="truncate">Download Master Template</span>
              </button>

              {/* Step 2 */}
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">2</span>
                <span className="text-xs font-semibold text-slate-700">Upload your filled template</span>
              </div>
              <form className="mt-2 space-y-2.5" onSubmit={handleMasterImport}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  className="block w-full rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-3 py-2.5 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-violet-700"
                />
                <p className="text-[10px] leading-4 text-slate-400">
                  Each row = one village. Data is matched by column name and distributed across all CSV files automatically.
                </p>
                <button
                  type="submit"
                  disabled={bulkImporting || !bulkFile}
                  className="flex w-full items-center justify-center rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkImporting ? 'Distributing data…' : 'Import & Distribute All Data'}
                </button>
              </form>
            </section>
          </aside>

          <section className="space-y-5">

            {/* ── Village selector banner (non-village CSVs only) ── */}
            {!isVillageFile && requiresVillage && (
              <div className="rounded-[20px] border border-sky-200 bg-sky-50 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Active Village</p>
                    <p className="mt-0.5 text-xs text-sky-600">
                      vlcode &amp; village_name will be filled automatically for every row you add.
                    </p>
                  </div>
                  <select
                    value={selectedVillage?.[VILLAGE_CODE_FIELD] || ''}
                    onChange={(event) => setSelectedVillageCode(event.target.value)}
                    disabled={villageLocked}
                    className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 sm:w-64"
                  >
                    {villageRows.length === 0 && <option value="">Add a village first</option>}
                    {villageRows.map((village) => (
                      <option key={village.vlcode} value={village.vlcode}>
                        {village.village_name} · {village.vlcode}
                        {village.district ? ` · ${village.district}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {villageLocked && (
                  <p className="mt-3 text-xs text-amber-700">
                    Add at least one village in <span className="font-semibold">Village.csv</span> to unlock this form.
                  </p>
                )}
              </div>
            )}

            {/* ── Add / Edit row form ── */}
            <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingRowIndex === null ? 'Add a new row' : `Edit row ${editingRowIndex + 1}`}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedFile
                      ? `Editing ${selectedFile} — ${editableHeaders.length} column${editableHeaders.length !== 1 ? 's' : ''}`
                      : 'Select a CSV file from the sidebar to begin.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {editingRowIndex !== null && (
                    <button type="button" onClick={() => resetForm()}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700">
                      Cancel Edit
                    </button>
                  )}
                  <button type="button" onClick={() => resetForm()}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
                    Clear Form
                  </button>
                  {editingRowIndex !== null && (
                    <button
                      type="button"
                      onClick={handleDeleteRow}
                      disabled={saving || deletingRow}
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingRow ? 'Deletingâ€¦' : 'Delete Row'}
                    </button>
                  )}
                </div>
              </div>

              {/* Add custom column */}
              <div className="mt-4 flex gap-2">
                <input
                  value={newColumnName}
                  onChange={(event) => setNewColumnName(event.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddColumn())}
                  placeholder="Add custom column…"
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
                <button type="button" onClick={handleAddColumn}
                  className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  + Column
                </button>
              </div>

              <form className="mt-5" onSubmit={handleSaveRow}>
                {editableHeaders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-400">
                    Select a CSV file to load its columns.
                  </div>
                ) : (
                  <>
                    {/* Village.csv — show only the 12 core village-profile columns */}
                    {isVillageFile && (() => {
                      const VILLAGE_PROFILE = ['vlcode','village_name','district','state','total_population','total_area_ha','builtup_area_ha','agricultural_area_ha','water_bodies_area_ha','total_households','total_livestock','total_vehicles'];
                      const profileHeaders = editableHeaders.filter(h => VILLAGE_PROFILE.includes(h));
                      return (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {profileHeaders.map((header) => (
                            <label key={header} className="block">
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{header}</span>
                              <input
                                value={formData[header] || ''}
                                onChange={(e) => handleFieldChange(header, e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
                              />
                            </label>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Village.csv hint: activity columns hidden */}
                    {isVillageFile && (
                      <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
                        Activity data columns (Agriculture, Energy, Livestock, etc.) are managed separately via their own CSV files and are not shown here.
                      </p>
                    )}

                    {/* Non-village CSV fields */}
                    {!isVillageFile && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {editableHeaders.map((header) => {
                          const isAutoFilled = !isVillageFile && (header === VILLAGE_CODE_FIELD || header === VILLAGE_NAME_FIELD);
                          return (
                            <label key={header} className="block">
                              <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                {header}
                                {isAutoFilled && <span className="rounded bg-sky-100 px-1 py-0.5 text-[9px] font-semibold text-sky-600">auto</span>}
                              </span>
                              <input
                                value={formData[header] || ''}
                                onChange={(e) => handleFieldChange(header, e.target.value)}
                                readOnly={isAutoFilled}
                                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${
                                  isAutoFilled
                                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                                    : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'
                                }`}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={saveDisabled || deletingRow}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : editingRowIndex === null ? 'Add Row to CSV' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </article>

            {/* ── Preview table ── */}
            <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Data Preview</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Click any row to load it into the form above for editing.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {loadingCsv ? 'Loading…' : `${csvData?.rowCount ?? 0} rows`}
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <div className="max-h-[480px] overflow-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                      <tr>
                        <th className="w-10 px-4 py-3 text-xs font-semibold">#</th>
                        {editableHeaders.map((header) => (
                          <th key={header} className="whitespace-nowrap px-4 py-3 text-xs font-semibold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.length === 0 ? (
                        <tr>
                          <td colSpan={Math.max(editableHeaders.length + 1, 1)} className="px-4 py-12 text-center text-sm text-slate-400">
                            {selectedFile ? 'No rows in this CSV yet.' : 'Select a CSV file to preview data.'}
                          </td>
                        </tr>
                      ) : (
                        previewRows.map((row, rowIndex) => (
                          <tr
                            key={`${selectedFile}-${rowIndex}`}
                            onClick={() => beginEditRow(row, rowIndex)}
                            className={`cursor-pointer border-t border-slate-100 transition hover:bg-emerald-50/60 ${editingRowIndex === rowIndex ? 'bg-emerald-50' : ''}`}
                          >
                            <td className="px-4 py-3 text-xs font-bold text-slate-400">{rowIndex + 1}</td>
                            {editableHeaders.map((header) => (
                              <td key={`${rowIndex}-${header}`} className="max-w-[180px] px-4 py-3 text-slate-700">
                                <div className="truncate text-xs" title={row[header] || ''}>
                                  {row[header] || <span className="text-slate-300">—</span>}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
