'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { getFirebaseClientAuth } from '@/lib/firebaseClient';

type CsvRow = Record<string, string>;

const MASTER_FILE = 'Village.csv';
// VL_CODE and VL_NAME are derived at runtime from Village.csv column[0] and column[1]
// These fallbacks are only used before the CSV headers are loaded
const DEFAULT_VL_CODE = 'vlcode';
const DEFAULT_VL_NAME = 'village_name';

// ── helpers ────────────────────────────────────────────────────────────────
function toLabel(col: string) {
  return col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeError(msg: string) {
  if (/EROFS|read-only/i.test(msg)) return 'Firestore not configured correctly.';
  if (/Cloud Firestore API|PERMISSION_DENIED/i.test(msg)) return 'Firestore not enabled. Open Firebase Console and create the Firestore Database.';
  if (/Missing Firebase admin/i.test(msg)) return 'Firebase admin env vars missing. Add them in your deployment settings.';
  return msg.trim();
}

// ── inline-edit cell ────────────────────────────────────────────────────────
function EditCell({
  value,
  locked,
  onChange,
}: {
  value: string;
  locked: boolean;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (locked) {
    return (
      <span className="block max-w-[140px] truncate rounded bg-sky-50 px-2 py-1 text-xs text-sky-700">
        {value || '—'}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onChange(draft); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { setEditing(false); onChange(draft); }
          if (e.key === 'Escape') { setEditing(false); setDraft(value); }
        }}
        className="w-full min-w-[80px] rounded border border-emerald-400 bg-white px-2 py-1 text-xs text-slate-800 outline-none ring-1 ring-emerald-300"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="block max-w-[140px] truncate rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
    >
      {value || <span className="text-slate-300">click to edit</span>}
    </button>
  );
}

// ── main component ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();

  // auth
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  // data
  const [files, setFiles] = useState<string[]>([]);
  const [villages, setVillages] = useState<CsvRow[]>([]);
  const [villageHeaders, setVillageHeaders] = useState<string[]>([]);
  const [activeVlcode, setActiveVlcode] = useState('');
  const [activeFile, setActiveFile] = useState(MASTER_FILE);

  // derive pk + name col from Village.csv headers dynamically
  const VL_CODE = villageHeaders[0] || DEFAULT_VL_CODE;
  const VL_NAME = villageHeaders[1] || DEFAULT_VL_NAME;

  // current file state
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);

  // ui state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // add-village modal — fields built dynamically from Village.csv headers
  const [showAddVillage, setShowAddVillage] = useState(false);
  const [newVillage, setNewVillage] = useState<CsvRow>({});

  // add-column modal
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState('');

  // csv upload
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // delete-village confirm
  const [confirmDeleteVl, setConfirmDeleteVl] = useState(false);

  const activeVillage = villages.find((v) => v[VL_CODE] === activeVlcode) || null;
  const isMasterFile = activeFile === MASTER_FILE;

  // ── toast helper ──────────────────────────────────────────────────────────
  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ── API helpers ───────────────────────────────────────────────────────────
  async function apiGet(file: string) {
    const res = await fetch(`/api/admin/csv/${encodeURIComponent(file)}`, { cache: 'no-store' });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Failed to load.');
    return d as { headers: string[]; rows: CsvRow[] };
  }

  async function apiPost(file: string, row: CsvRow) {
    const res = await fetch(`/api/admin/csv/${encodeURIComponent(file)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Failed to add row.');
    return d as { headers: string[]; rows: CsvRow[] };
  }

  async function apiPut(file: string, rowIndex: number, row: CsvRow) {
    const res = await fetch(`/api/admin/csv/${encodeURIComponent(file)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex, row }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Failed to update.');
    return d as { headers: string[]; rows: CsvRow[] };
  }

  async function apiDelete(file: string, rowIndex: number) {
    const res = await fetch(`/api/admin/csv/${encodeURIComponent(file)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Failed to delete.');
    return d as { headers: string[]; rows: CsvRow[] };
  }

  async function apiDeleteCol(file: string, colName: string) {
    const res = await fetch(`/api/admin/csv/${encodeURIComponent(file)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colName }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Failed to delete column.');
    return d as { headers: string[]; rows: CsvRow[] };
  }

  // ── load helpers ──────────────────────────────────────────────────────────
  async function loadVillages(preferVlcode?: string) {
    try {
      const d = await apiGet(MASTER_FILE);
      setVillages(d.rows);
      setVillageHeaders(d.headers);
      const pkCol = d.headers[0] || DEFAULT_VL_CODE;
      const pick = preferVlcode || d.rows[0]?.[pkCol] || '';
      setActiveVlcode(pick);
      return d.rows;
    } catch {
      setVillages([]);
      setVillageHeaders([]);
      setActiveVlcode('');
      return [];
    }
  }

  async function loadFile(file: string) {
    setLoading(true);
    try {
      const d = await apiGet(file);
      setHeaders(d.headers);
      setRows(d.rows);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
      setHeaders([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles() {
    try {
      const res = await fetch('/api/admin/csv-files', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error);
      const all: string[] = d.files;
      const sorted = [MASTER_FILE, ...all.filter((f) => f !== MASTER_FILE)];
      setFiles(sorted);
      return sorted;
    } catch {
      return [];
    }
  }

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok || !d.success) { router.replace('/admin/login'); return; }
        setAdminEmail(d.user?.email || '');
        await loadFiles();
        const vls = await loadVillages();
        setActiveVlcode(vls[0]?.[VL_CODE] || '');
        setCheckingAuth(false);
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  // reload file whenever selection changes
  useEffect(() => {
    if (!checkingAuth && activeFile) loadFile(activeFile);
  }, [activeFile, checkingAuth]);

  // ── cell edit & save ──────────────────────────────────────────────────────
  async function handleCellChange(rowIndex: number, col: string, val: string) {
    const updated = rows.map((r, i) => i === rowIndex ? { ...r, [col]: val } : r);
    setRows(updated);
    setSaving(true);
    try {
      const d = await apiPut(activeFile, rowIndex, updated[rowIndex]);
      setRows(d.rows);
      setHeaders(d.headers);
      if (activeFile === MASTER_FILE) await loadVillages(activeVlcode);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
      await loadFile(activeFile);
    } finally {
      setSaving(false);
    }
  }

  // ── add row ───────────────────────────────────────────────────────────────
  async function handleAddRow() {
    const emptyRow: CsvRow = headers.reduce((acc, h) => {
      acc[h] = '';
      return acc;
    }, {} as CsvRow);

    // auto-fill village fields for non-master files
    if (!isMasterFile && activeVillage) {
      if (headers.includes(VL_CODE)) emptyRow[VL_CODE] = activeVillage[VL_CODE] || '';
      if (headers.includes(VL_NAME)) emptyRow[VL_NAME] = activeVillage[VL_NAME] || '';
    }

    setSaving(true);
    try {
      const d = await apiPost(activeFile, emptyRow);
      setRows(d.rows);
      setHeaders(d.headers);
      showToast('ok', 'Row added — click cells to fill data.');
      if (activeFile === MASTER_FILE) await loadVillages(activeVlcode);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── delete row ────────────────────────────────────────────────────────────
  async function handleDeleteRow(rowIndex: number) {
    if (!confirm(`Delete row ${rowIndex + 1}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const d = await apiDelete(activeFile, rowIndex);
      setRows(d.rows);
      setHeaders(d.headers);
      showToast('ok', 'Row deleted.');
      if (activeFile === MASTER_FILE) await loadVillages(activeVlcode);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── add column ────────────────────────────────────────────────────────────
  async function handleAddColumn() {
    const col = newColName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!col) return;
    if (headers.includes(col)) { showToast('err', `Column "${col}" already exists.`); return; }

    // Add column to every existing row by saving each with the new field = ''
    // Simplest: just update row 0 (which adds the column to the CSV headers), then reload
    // If no rows yet, add a dummy empty row
    setSaving(true);
    try {
      if (rows.length === 0) {
        const d = await apiPost(activeFile, { [col]: '' });
        setRows(d.rows);
        setHeaders(d.headers);
      } else {
        const d = await apiPut(activeFile, 0, { ...rows[0], [col]: '' });
        setRows(d.rows);
        setHeaders(d.headers);
      }
      setNewColName('');
      setShowAddCol(false);
      showToast('ok', `Column "${col}" added.`);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── add village ───────────────────────────────────────────────────────────
  async function handleAddVillage() {
    if (!newVillage[VL_CODE] || !newVillage[VL_NAME]) {
      showToast('err', 'Village code and name are required.'); return;
    }
    setSaving(true);
    try {
      const d = await apiPost(MASTER_FILE, newVillage);
      setVillages(d.rows);
      setActiveVlcode(newVillage[VL_CODE]);
      setShowAddVillage(false);
      setNewVillage({});
      showToast('ok', `Village "${newVillage[VL_NAME]}" added.`);
      if (activeFile === MASTER_FILE) { setHeaders(d.headers); setRows(d.rows); }
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── delete village ────────────────────────────────────────────────────────
  async function handleDeleteVillage() {
    const idx = villages.findIndex((v) => v[VL_CODE] === activeVlcode);
    if (idx === -1) return;
    setConfirmDeleteVl(false);
    setSaving(true);
    try {
      const d = await apiDelete(MASTER_FILE, idx);
      const remaining: CsvRow[] = d.rows;
      setVillages(remaining);
      setActiveVlcode(remaining[0]?.[VL_CODE] || '');
      showToast('ok', 'Village deleted.');
      if (activeFile === MASTER_FILE) { setHeaders(d.headers); setRows(d.rows); }
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── delete column ────────────────────────────────────────────────────────
  async function handleDeleteColumn(col: string) {
    if (col === VL_CODE || col === VL_NAME) {
      showToast('err', `Cannot delete primary key or name column.`); return;
    }
    if (!confirm(`Delete column "${col}" from "${activeFile}"?\n\nThis will remove this column from ALL rows permanently.`)) return;
    setSaving(true);
    try {
      const d = await apiDeleteCol(activeFile, col);
      setHeaders(d.headers);
      setRows(d.rows);
      showToast('ok', `Column "${col}" deleted.`);
      if (activeFile === MASTER_FILE) await loadVillages(activeVlcode);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── upload CSV ────────────────────────────────────────────────────────────
  async function handleUploadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!uploadInputRef.current) return;
    uploadInputRef.current.value = '';
    if (!file) return;

    // Use the active file as the target so the upload merges into the right dataset
    const targetFilename = activeFile;

    if (!confirm(`Upload "${file.name}" and merge into "${targetFilename}"?\n\nNew rows will be added, existing rows updated, and any new columns will be appended.`)) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('filename', targetFilename);
      const res = await fetch('/api/admin/upload-csv', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || 'Upload failed.');
      setHeaders(d.headers);
      setRows(d.rows);
      showToast('ok', d.message || `Merged: ${d.rowCount} rows × ${d.colCount} cols`);
      if (activeFile === MASTER_FILE) await loadVillages(activeVlcode);
    } catch (err) {
      showToast('err', normalizeError(err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/auth/session', { method: 'DELETE' });
      await signOut(getFirebaseClientAuth());
    } catch { /* best effort */ } finally {
      router.replace('/admin/login');
    }
  }

  // ── filter rows by active village for non-master files ────────────────────
  const visibleRows = isMasterFile
    ? rows
    : rows.filter((r) => !activeVlcode || r[VL_CODE] === activeVlcode || r[VL_CODE] === '');

  const visibleRowIndices = isMasterFile
    ? rows.map((_, i) => i)
    : rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !activeVlcode || r[VL_CODE] === activeVlcode || r[VL_CODE] === '')
        .map(({ i }) => i);

  // hide FK columns (vlcode, village_name) from non-master file tables — they are redundant
  const visibleHeaders = isMasterFile
    ? headers
    : headers.filter((h) => h !== VL_CODE && h !== VL_NAME);

  // ── loading gate ──────────────────────────────────────────────────────────
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-10 py-8 text-sm text-slate-500 shadow">
          Verifying admin access…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900">

      {/* hidden file input for CSV uploads */}
      <input
        ref={uploadInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleUploadCSV}
      />

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-lg ${
          toast.type === 'ok'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          <span className="text-sm font-medium">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="text-lg leading-none opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-bold">A</div>
          <span className="text-sm font-bold text-slate-800">Carbon Admin</span>
          {adminEmail && <span className="hidden text-xs text-slate-400 sm:block">{adminEmail}</span>}
          {saving && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Saving…</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
            Dashboard
          </Link>
          <button onClick={handleLogout} disabled={loggingOut}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </header>

      {/* ── VILLAGE BAR ── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Village</span>
        <select
          value={activeVlcode}
          onChange={(e) => setActiveVlcode(e.target.value)}
          disabled={villages.length === 0}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white disabled:opacity-50"
        >
          {villages.length === 0 && <option value="">No villages yet</option>}
          {villages.map((v) => (
            <option key={v[VL_CODE]} value={v[VL_CODE]}>
              {v[VL_NAME] || v[VL_CODE]}{v.district ? ` — ${v.district}` : ''}
            </option>
          ))}
        </select>
        {activeVillage && (
          <span className="hidden text-[11px] text-slate-400 sm:block">
            {Object.entries(activeVillage).map(([k, v]) => `${toLabel(k)}: ${v || '—'}`).join(' · ')}
          </span>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── FILE SIDEBAR ── */}
        <aside className="flex w-52 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Data Files</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {files.map((f) => {
              const isActive = activeFile === f;
              const isMaster = f === MASTER_FILE;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFile(f)}
                  disabled={!isMaster && villages.length === 0}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition ${
                    isActive
                      ? 'bg-emerald-50 font-semibold text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  } ${!isMaster && villages.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="truncate">{f.replace('.csv', '')}</span>
                  {isMaster && (
                    <span className="ml-auto rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-600">KEY</span>
                  )}
                </button>
              );
            })}
          </nav>
          {villages.length === 0 && (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
              Add a village first to unlock other files.
            </div>
          )}
        </aside>

        {/* ── TABLE AREA ── */}
        <main className="flex min-w-0 flex-1 flex-col">

          {/* table toolbar */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800">{activeFile}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                {loading ? '…' : `${visibleRows.length} row${visibleRows.length !== 1 ? 's' : ''} · ${visibleHeaders.length} col${visibleHeaders.length !== 1 ? 's' : ''}`}
              </span>
              {!isMasterFile && activeVillage && (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  {activeVillage[VL_NAME]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => uploadInputRef.current?.click()}
                disabled={uploading || saving}
                title={`Upload a CSV to merge into ${activeFile}`}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : '↑ Upload CSV'}
              </button>
              <button
                onClick={() => setShowAddCol(true)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
              >
                + Column
              </button>
              <button
                onClick={handleAddRow}
                disabled={saving || (!isMasterFile && !activeVillage)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                + Row
              </button>
              {isMasterFile && (
                <button
                  onClick={() => setShowAddVillage(true)}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  + New Village
                </button>
              )}
              {isMasterFile && activeVillage && (
                <button
                  onClick={() => setConfirmDeleteVl(true)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  Delete Village
                </button>
              )}
            </div>
          </div>

          {/* table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>
            ) : headers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Select a file from the sidebar.
              </div>
            ) : (
              <table className="min-w-full border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-800 text-white">
                    <th className="w-10 px-3 py-2.5 text-[10px] font-semibold text-slate-400">#</th>
                    {visibleHeaders.map((h) => {
                      const isProtected = h === VL_CODE || h === VL_NAME;
                      return (
                        <th key={h} className="group whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
                          <div className="flex items-center gap-1.5">
                            <span>{toLabel(h)}</span>
                            {!isProtected && (
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(h)}
                                title={`Delete column "${h}"`}
                                className="hidden rounded px-1 py-0.5 text-[9px] font-bold text-red-300 opacity-0 transition hover:bg-red-800 hover:text-red-100 group-hover:block group-hover:opacity-100"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="w-14 px-3 py-2.5 text-[10px] font-semibold text-slate-400">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleHeaders.length + 2} className="px-4 py-12 text-center text-sm text-slate-400">
                        No rows yet — click "+ Row" to add one.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row, visIdx) => {
                      const realIdx = visibleRowIndices[visIdx];
                      return (
                        <tr key={`${activeFile}-${realIdx}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-[11px] font-bold text-slate-400">{visIdx + 1}</td>
                          {visibleHeaders.map((h) => (
                            <td key={h} className="px-3 py-1.5">
                              <EditCell
                                value={row[h] || ''}
                                locked={false}
                                onChange={(val) => handleCellChange(realIdx, h, val)}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-1.5">
                            <button
                              onClick={() => handleDeleteRow(realIdx)}
                              className="rounded px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-50 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* ── ADD VILLAGE MODAL ── dynamic fields from Village.csv headers ── */}
      {showAddVillage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900">Add New Village</h2>
            <p className="mt-1 text-xs text-slate-500">
              {VL_CODE} and {VL_NAME} are required. This entry becomes the foreign key for all other files.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(villageHeaders.length > 0 ? villageHeaders : [VL_CODE, VL_NAME]).map((col) => (
                <label key={col} className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                    {toLabel(col)}
                    {(col === VL_CODE || col === VL_NAME) && <span className="ml-1 text-red-400">*</span>}
                  </span>
                  <input
                    value={newVillage[col] || ''}
                    onChange={(e) => setNewVillage((v) => ({ ...v, [col]: e.target.value }))}
                    placeholder={col}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={handleAddVillage} disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? 'Adding…' : 'Add Village'}
              </button>
              <button onClick={() => { setShowAddVillage(false); setNewVillage({}); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD COLUMN MODAL ── */}
      {showAddCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900">Add New Column</h2>
            <p className="mt-1 text-xs text-slate-500">
              Column will be added to <span className="font-semibold">{activeFile}</span>. All existing rows will have an empty value for this column.
            </p>
            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              placeholder="e.g. solar_panels_count"
              autoFocus
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">Use lowercase with underscores. Spaces will be converted automatically.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={handleAddColumn} disabled={saving || !newColName.trim()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? 'Adding…' : 'Add Column'}
              </button>
              <button onClick={() => { setShowAddCol(false); setNewColName(''); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE VILLAGE CONFIRM MODAL ── */}
      {confirmDeleteVl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-red-700">Delete Village?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will remove <span className="font-semibold">"{activeVillage?.[VL_NAME]}"</span> from Village.csv.
              Data rows in other files linked to this village code will remain but will lose their village reference.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={handleDeleteVillage} disabled={saving}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button onClick={() => setConfirmDeleteVl(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
