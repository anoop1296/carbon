'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';

import { getFirebaseClientAuth } from '@/lib/firebaseClient';

type CsvRow = Record<string, string>;

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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFilename, setUploadFilename] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CSV files.');
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
      setError(err instanceof Error ? err.message : 'Failed to load CSV data.');
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
      setError(`Column "${header}" already exists.`);
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
      setError('Please select a CSV file first.');
      return;
    }

    if (requiresVillage && !selectedVillage) {
      setError('Please create or select a village in Village.csv first.');
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
      setError(err instanceof Error ? err.message : 'Failed to save row.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadFile) {
      setError('Please choose a CSV file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', uploadFile);
      if (uploadFilename.trim()) {
        formDataToSend.append('filename', uploadFilename.trim());
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataToSend,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload CSV.');
      }

      const nextFilename = data.filename as string;
      setMessage(data.message || 'CSV uploaded successfully.');
      setUploadFile(null);
      setUploadFilename('');
      await loadFiles(nextFilename);
      await loadCsv(nextFilename);
      await loadVillageMaster(selectedVillage?.[VILLAGE_CODE_FIELD]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV.');
    } finally {
      setUploading(false);
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

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setUploadFile(file);
    if (file && !uploadFilename) {
      setUploadFilename(file.name);
    }
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <header className="rounded-[28px] border border-emerald-100 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                CSV Admin Panel
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Manage dashboard CSV data directly
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Upload a new CSV, replace an existing one, add new rows, or update rows already stored in
                <span className="font-semibold text-emerald-700"> public/Clean2</span>.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {adminEmail && (
                <div className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700">
                  {adminEmail}
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                Open Dashboard
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Back Home
              </Link>
            </div>
          </div>
        </header>

        {(message || error) && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Available CSVs</h2>
                <button
                  type="button"
                  onClick={() => loadFiles(selectedFile)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Select file
                </label>
                <select
                  value={selectedFile}
                  onChange={(event) => setSelectedFile(event.target.value)}
                  disabled={loadingFiles || files.length === 0}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
                >
                  {files.length === 0 && <option value="">No CSV files found</option>}
                  {files.map((file) => (
                    <option
                      key={file}
                      value={file}
                      disabled={file !== MASTER_VILLAGE_FILE && villageRows.length === 0}
                    >
                      {file}
                    </option>
                  ))}
                </select>
              </div>

              {villageRows.length === 0 && files.includes(MASTER_VILLAGE_FILE) && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Fill <span className="font-semibold">Village.csv</span> first. Other village-based CSV forms will
                  unlock after at least one village is added there.
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Files</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {loadingFiles ? '...' : files.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Rows</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {loadingCsv ? '...' : csvData?.rowCount ?? 0}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-semibold text-slate-900">Upload or Replace CSV</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Upload any `.csv` file. If the filename matches an existing file, it will replace that CSV.
              </p>

              <form className="mt-4 space-y-4" onSubmit={handleUpload}>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Target filename
                  </label>
                  <input
                    value={uploadFilename}
                    onChange={(event) => setUploadFilename(event.target.value)}
                    placeholder="Village.csv"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    CSV file
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileInputChange}
                    className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </button>
              </form>
            </section>
          </aside>

          <section className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {editingRowIndex === null ? 'Add a new row' : `Edit row ${editingRowIndex + 1}`}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Fields are generated from the selected CSV header. Add a new column if you need extra data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetForm()}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                  >
                    Clear Form
                  </button>
                </div>

                {!isVillageFile && requiresVillage && (
                  <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Select village master
                    </label>
                    <select
                      value={selectedVillage?.[VILLAGE_CODE_FIELD] || ''}
                      onChange={(event) => setSelectedVillageCode(event.target.value)}
                      disabled={villageLocked}
                      className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400"
                    >
                      {villageRows.length === 0 && <option value="">Add village data first</option>}
                      {villageRows.map((village) => (
                        <option key={village.vlcode} value={village.vlcode}>
                          {village.village_name} ({village.vlcode})
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm text-sky-700">
                      The selected village will automatically fill `vlcode` and `village_name` in this CSV.
                    </p>
                  </div>
                )}

                {villageLocked && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Add at least one village in <span className="font-semibold">Village.csv</span> before updating this
                    file.
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row">
                  <input
                    value={newColumnName}
                    onChange={(event) => setNewColumnName(event.target.value)}
                    placeholder="Add custom column name"
                    className="flex-1 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Add Column
                  </button>
                </div>

                <form className="mt-5" onSubmit={handleSaveRow}>
                  <div className="grid gap-4 md:grid-cols-2">
                    {editableHeaders.length === 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        Select a CSV file to load its headers.
                      </div>
                    )}

                    {editableHeaders.map((header) => (
                      <label key={header} className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {header}
                        </span>
                        <input
                          value={formData[header] || ''}
                          onChange={(event) => handleFieldChange(header, event.target.value)}
                          readOnly={!isVillageFile && (header === VILLAGE_CODE_FIELD || header === VILLAGE_NAME_FIELD)}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-800 outline-none transition ${
                            !isVillageFile && (header === VILLAGE_CODE_FIELD || header === VILLAGE_NAME_FIELD)
                              ? 'border-sky-200 bg-sky-50'
                              : 'border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white'
                          }`}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={saveDisabled}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? 'Saving...'
                        : editingRowIndex === null
                          ? 'Add Row to CSV'
                          : 'Update Row in CSV'}
                    </button>
                    {editingRowIndex !== null && (
                      <button
                        type="button"
                        onClick={() => resetForm()}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </article>

              <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <h2 className="text-lg font-semibold text-slate-900">Current file details</h2>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Filename</div>
                    <div className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {selectedFile || 'No file selected'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Headers</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {editableHeaders.length === 0 && (
                        <span className="text-sm text-slate-500">No headers loaded yet.</span>
                      )}
                      {editableHeaders.map((header) => (
                        <span
                          key={header}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          {header}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Click any row in the preview table below to load it into the form and update the same CSV.
                  </div>
                </div>
              </article>
            </div>

            <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Preview rows</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Click any row to load it into the form and update the same CSV file.
                  </p>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {loadingCsv ? 'Loading data' : `${csvData?.rowCount ?? 0} total rows`}
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <div className="max-h-[520px] overflow-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-white">
                      <tr>
                        <th className="px-4 py-3 font-semibold">#</th>
                        {editableHeaders.map((header) => (
                          <th key={header} className="px-4 py-3 font-semibold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={Math.max(editableHeaders.length + 1, 1)}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            {selectedFile ? 'No rows available in this CSV.' : 'Select a CSV file to preview data.'}
                          </td>
                        </tr>
                      )}

                      {previewRows.map((row, rowIndex) => (
                        <tr
                          key={`${selectedFile}-${rowIndex}`}
                          onClick={() => beginEditRow(row, rowIndex)}
                          className="cursor-pointer border-t border-slate-100 transition hover:bg-emerald-50/70"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-500">{rowIndex + 1}</td>
                          {editableHeaders.map((header) => (
                            <td key={`${rowIndex}-${header}`} className="max-w-[220px] px-4 py-3 text-slate-700">
                              <div className="truncate" title={row[header] || ''}>
                                {row[header] || '-'}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
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
