'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { getFirebaseClientAuth } from '@/lib/firebaseClient';

type CsvRow = Record<string, string>;

interface MasterColumn {
  key: string;
  file: string;
  col: string;
  label: string;
  isIdentity: boolean;
}

const MASTER_FILE = 'Village.csv';
const DEFAULT_VL_CODE = 'vlcode';
const DEFAULT_VL_NAME = 'village_name';
const MASTER_VIEW_ID = '__master_view__';
const GLOBAL_FILES = new Set(['Emission_Factors.csv', 'Monthly_Activity_Wide.csv']);

function toLabel(col: string) {
  return col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fileLabel(filename: string) {
  const base = filename.replace('.csv', '');
  return base.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Returns { prefix: 'before'|'after'|null, label: string } for a column name
function parseColPrefix(col: string): { prefix: 'before' | 'after' | null; label: string } {
  if (col.startsWith('before_')) return { prefix: 'before', label: toLabel(col.slice(7)) };
  if (col.startsWith('after_'))  return { prefix: 'after',  label: toLabel(col.slice(6)) };
  return { prefix: null, label: toLabel(col) };
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
  // Latest prop value, used so stale closures inside async blur don't clobber.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Only sync draft from prop when NOT editing — otherwise a parent re-render
  // mid-typing would overwrite what the user just typed.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = (next: string) => {
    setEditing(false);
    // Only call onChange if value actually changed — prevents needless saves
    // and prevents an in-flight unrelated save from being clobbered.
    if (next !== valueRef.current) onChange(next);
  };

  if (locked) {
    return (
      <span className="block w-full max-w-full truncate rounded bg-sky-50 px-2 py-1 text-xs text-sky-700">
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
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
          if (e.key === 'Escape') { setEditing(false); setDraft(valueRef.current); }
        }}
        className="w-full min-w-[80px] rounded border border-emerald-400 bg-white px-2 py-1 text-xs text-slate-800 outline-none ring-1 ring-emerald-300"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      className={`block w-full min-h-[28px] max-w-full truncate rounded border px-2 py-1.5 text-left text-xs cursor-text transition-colors ${
        value
          ? 'border-transparent text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900'
          : 'border-dashed border-slate-200 text-slate-300 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
      }`}
    >
      {value || 'click to edit'}
    </button>
  );
}

// ── inline-edit column label ───────────────────────────────────────────────
function LabelEditor({
  name,
  display,
  disabled,
  onRename,
  onDelete,
}: {
  name: string;
  display: string;
  disabled: boolean;
  onRename: (newName: string) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(name); }, [name, editing]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (!next) {
      // Blank submit → delete the column (only if a handler is provided).
      if (onDelete) onDelete();
      else setDraft(name); // no deleter → revert
      return;
    }
    if (next !== name) onRename(next);
  };

  if (disabled) {
    return <span className="truncate text-[11px] font-semibold uppercase text-slate-500">{display}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setEditing(false); setDraft(name); }
        }}
        className="min-w-[120px] rounded border border-emerald-400 bg-white px-2 py-1 text-[11px] font-semibold uppercase text-slate-700 outline-none ring-1 ring-emerald-300"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(name); setEditing(true); }}
      title="Click to rename this column"
      className="truncate rounded px-1 py-0.5 text-left text-[11px] font-semibold uppercase text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
    >
      {display}
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

  // current file state (individual file view)
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);

  // master view state
  const [masterColumns, setMasterColumns] = useState<MasterColumn[]>([]);
  const [masterRows, setMasterRows] = useState<CsvRow[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterFilterFile, setMasterFilterFile] = useState<string>('');

  // ui state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // add-village modal
  const [showAddVillage, setShowAddVillage] = useState(false);
  const [newVillage, setNewVillage] = useState<CsvRow>({});

  // add-column modal
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColCategory, setNewColCategory] = useState<'before' | 'after' | null>(null);
  // Columns the user just added — kept visible in the card view even when their
  // value is empty so the user has somewhere to type. Scoped per file + per
  // village so each village only shows the columns IT added. Persisted in
  // localStorage so a full browser refresh doesn't wipe pending fields.
  const PENDING_KEY_STORAGE = 'admin:pendingCols:v2';
  const [pendingMap, setPendingMap] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(PENDING_KEY_STORAGE);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(PENDING_KEY_STORAGE, JSON.stringify(pendingMap)); } catch { /* ignore */ }
  }, [pendingMap]);
  const pendingKey = `${activeFile}::${activeVlcode}`;
  const pendingCols = new Set(pendingMap[pendingKey] || []);
  const addPendingCol = (col: string) => {
    setPendingMap(prev => {
      const existing = prev[pendingKey] || [];
      if (existing.includes(col)) return prev;
      return { ...prev, [pendingKey]: [...existing, col] };
    });
  };
  const removePendingCol = (col: string) => {
    setPendingMap(prev => {
      const existing = prev[pendingKey];
      if (!existing || !existing.includes(col)) return prev;
      const next = existing.filter(c => c !== col);
      return { ...prev, [pendingKey]: next };
    });
  };

  // Per-village hidden-column tracking. When a column is added/exposed for
  // village A, we mark that column "hidden" for all OTHER villages so they
  // don't see a phantom field in their card just because the CSV header
  // structurally contains it. A hidden column comes back automatically the
  // moment that village actually gets a non-empty value or explicitly re-adds
  // the column via "+ Column".
  const HIDDEN_KEY_STORAGE = 'admin:hiddenCols:v1';
  const [hiddenMap, setHiddenMap] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(HIDDEN_KEY_STORAGE);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(HIDDEN_KEY_STORAGE, JSON.stringify(hiddenMap)); } catch { /* ignore */ }
  }, [hiddenMap]);
  const hiddenCols = new Set(hiddenMap[pendingKey] || []);
  // Mark `col` hidden for every village in this file EXCEPT the active one.
  const markColumnHiddenForOtherVillages = (col: string) => {
    setHiddenMap(prev => {
      const next = { ...prev };
      for (const v of villages) {
        const otherCode = v[VL_CODE];
        if (!otherCode || otherCode === activeVlcode) continue;
        const key = `${activeFile}::${otherCode}`;
        const existing = next[key] || [];
        if (existing.includes(col)) continue;
        next[key] = [...existing, col];
      }
      // Make sure the active village does NOT hide this column.
      const myKey = `${activeFile}::${activeVlcode}`;
      const myList = next[myKey];
      if (myList && myList.includes(col)) {
        next[myKey] = myList.filter(c => c !== col);
      }
      return next;
    });
  };
  // When a column genuinely gets data for this village, unhide it here.
  const unhideColumnForActiveVillage = (col: string) => {
    setHiddenMap(prev => {
      const existing = prev[pendingKey];
      if (!existing || !existing.includes(col)) return prev;
      return { ...prev, [pendingKey]: existing.filter(c => c !== col) };
    });
  };

  // csv upload (per-file)
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // master CSV upload
  const masterUploadRef = useRef<HTMLInputElement>(null);
  const [masterUploading, setMasterUploading] = useState(false);

  // delete-village confirm
  const [confirmDeleteVl, setConfirmDeleteVl] = useState(false);

  const activeVillage = villages.find((v) => v[VL_CODE] === activeVlcode) || null;
  const isMasterFile = activeFile === MASTER_FILE;
  const isMasterView = activeFile === MASTER_VIEW_ID;
  const needsCategory = activeFile === 'sequestration.csv' || activeFile === 'budget.csv';
  const canReuseExistingVillageColumn = !isMasterFile && !GLOBAL_FILES.has(activeFile);
  const filePkCol = headers[0] || VL_CODE;
  const fileNameCol = headers[1] || VL_NAME;
  const isVillageScoped = canReuseExistingVillageColumn && headers.length > 0;
  const protectedHeaders = new Set(isMasterFile ? [VL_CODE, VL_NAME] : [filePkCol, fileNameCol].filter(Boolean));

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

  async function apiRenameCol(file: string, oldName: string, newName: string) {
    const res = await fetch(`/api/admin/csv/${encodeURIComponent(file)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Failed to rename column.');
    return d as { headers: string[]; rows: CsvRow[] };
  }

  // ── master view API helpers ───────────────────────────────────────────────
  async function loadMasterView() {
    setMasterLoading(true);
    try {
      const res = await fetch('/api/admin/master-view', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || 'Failed to load master view.');
      setMasterColumns(d.columns as MasterColumn[]);
      setMasterRows(d.rows as CsvRow[]);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setMasterLoading(false);
    }
  }

  async function handleMasterCellChange(rowIndex: number, colKey: string, value: string) {
    const vlcode = masterRows[rowIndex]?.[`__id__::${VL_CODE}`] || masterRows[rowIndex]?.[`__id__::vlcode`] || '';
    if (!vlcode) return;

    // Optimistic update
    const updated = masterRows.map((r, i) => i === rowIndex ? { ...r, [colKey]: value } : r);
    setMasterRows(updated);
    setSaving(true);

    try {
      const res = await fetch('/api/admin/master-view', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vlcode, colKey, value }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || 'Failed to update.');
      showToast('ok', d.message || 'Saved.');
      if (activeFile === MASTER_FILE) await loadVillages(activeVlcode);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
      await loadMasterView();
    } finally {
      setSaving(false);
    }
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
    if (checkingAuth) return;
    if (isMasterView) {
      loadMasterView();
    } else if (activeFile) {
      loadFile(activeFile);
    }
  }, [activeFile, checkingAuth]);

  // ── cell edit & save ──────────────────────────────────────────────────────
  // We optimistically update local state and DO NOT overwrite rows from the
  // server response — otherwise concurrent edits in different cells race and
  // an in-flight PUT can clobber a newer edit. Headers may change (new column
  // appended server-side), so only merge new headers.
  async function handleCellChange(rowIndex: number, col: string, val: string) {
    if (val === (rows[rowIndex]?.[col] || '')) return; // no-op edits skip the network
    setRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, [col]: val } : r));
    // Once this village actually fills a value, the column is no longer a
    // phantom for them — let it remain visible on its own merit.
    if (val.trim() !== '') unhideColumnForActiveVillage(col);
    setSaving(true);
    try {
      const d = await apiPut(activeFile, rowIndex, { [col]: val });
      setHeaders(prev => {
        const extra = d.headers.filter(h => !prev.includes(h));
        return extra.length ? [...prev, ...extra] : prev;
      });
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

    if (!isMasterFile && activeVillage) {
      if (headers.includes(filePkCol)) emptyRow[filePkCol] = activeVillage[VL_CODE] || '';
      if (headers.includes(fileNameCol)) emptyRow[fileNameCol] = activeVillage[VL_NAME] || '';
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
    const raw = newColName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!raw) return;
    if (needsCategory && !newColCategory) {
      showToast('err', 'Please choose a category (Existing or Added).');
      return;
    }

    const requested = needsCategory ? `${newColCategory}_${raw}` : raw;
    const activeVillageRowIndex = isVillageScoped
      ? rows.findIndex((row) => row[filePkCol] === activeVlcode)
      : -1;
    // Case-insensitive header lookup so "Livestock" and "livestock" don't
    // create duplicate columns by accident.
    const existingHeader = headers.find(h => h.toLowerCase() === requested.toLowerCase());
    const hasColumn = !!existingHeader;
    // If the column already exists, reuse its EXACT casing instead of creating
    // a near-duplicate header (e.g. user types "livestock" but header is
    // "Livestock" — we want the field to map to the existing column).
    const col = existingHeader || requested;

    setSaving(true);
    try {
      let d: { headers: string[]; rows: CsvRow[] } | null = null;

      if (hasColumn) {
        // Column header is already in the CSV — just make it visible/usable
        // for THIS village. Same column name across villages is fully allowed:
        // each village still keeps its own per-row value.
        if (activeVillageRowIndex >= 0) {
          addPendingCol(col);
          unhideColumnForActiveVillage(col);
          setNewColName('');
          setNewColCategory(null);
          setShowAddCol(false);
          showToast('ok', `"${col}" ready for this village — click the cell to enter a value.`);
          return;
        }

        if (activeVillage && isVillageScoped) {
          // No row yet for this village in this file — create one. The column
          // already exists in headers, so just seeding {pk, name} is enough.
          const seedRow: CsvRow = { [col]: '' };
          const pk = activeVillage[VL_CODE] || '';
          const name = activeVillage[VL_NAME] || '';
          if (pk) seedRow[filePkCol] = pk;
          if (name) seedRow[fileNameCol] = name;
          d = await apiPost(activeFile, seedRow);
        } else {
          // Global file (no village dimension) or master file: column exists,
          // just expose it to the user — no structural change needed.
          addPendingCol(col);
          unhideColumnForActiveVillage(col);
          setNewColName('');
          setNewColCategory(null);
          setShowAddCol(false);
          showToast('ok', `"${col}" is ready — click the cell to enter a value.`);
          return;
        }
      } else if (canReuseExistingVillageColumn && activeVillage) {
        if (activeVillageRowIndex >= 0) {
          d = await apiPut(activeFile, activeVillageRowIndex, { [col]: '' });
        } else {
          const seedRow: CsvRow = { [col]: '' };
          const pk = activeVillage[VL_CODE] || '';
          const name = activeVillage[VL_NAME] || '';
          if (pk) seedRow[filePkCol] = pk;
          if (name) seedRow[fileNameCol] = name;
          d = await apiPost(activeFile, seedRow);
        }
      } else if (rows.length === 0) {
        const seedRow: CsvRow = { [col]: '' };
        if (!isMasterFile && activeVillage) {
          const pk = activeVillage[VL_CODE] || '';
          const name = activeVillage[VL_NAME] || '';
          if (pk) seedRow[filePkCol] = pk;
          if (name) seedRow[fileNameCol] = name;
        }
        d = await apiPost(activeFile, seedRow);
      } else {
        d = await apiPut(activeFile, 0, { [col]: '' });
      }

      if (d) {
        setRows(d.rows);
        setHeaders(d.headers);
      }
      addPendingCol(col);
      unhideColumnForActiveVillage(col);
      // New column was just added by THIS village — keep other villages from
      // seeing a phantom empty field by default. They'll only see it again if
      // they explicitly add the same column name themselves.
      if (!isMasterFile && isVillageScoped) markColumnHiddenForOtherVillages(col);
      setNewColName('');
      setNewColCategory(null);
      setShowAddCol(false);
      showToast('ok', `Column "${col}" added — click the cell to enter a value.`);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // add village
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

  // ── rename column ────────────────────────────────────────────────────────
  async function handleRenameColumn(oldName: string, newName: string) {
    if (protectedHeaders.has(oldName)) {
      showToast('err', 'Cannot rename the primary key or name column.'); return;
    }
    const raw = newName.trim().replace(/\s+/g, '_');
    if (!raw) return;
    if (raw === oldName) return;

    // If the target name already exists, treat this as "use the existing
    // column instead" — case-insensitive match. This lets the user retype an
    // existing column name (e.g. Gosaipur has "livestok", Bhatsar wants the
    // same) without the rename being blocked. We just expose that column for
    // the active village; the per-village row values stay independent.
    const existing = headers.find(h => h.toLowerCase() === raw.toLowerCase());
    if (existing && existing !== oldName) {
      addPendingCol(existing);
      removePendingCol(oldName);
      showToast('ok', `"${existing}" is ready for this village — click the cell to enter a value.`);
      return;
    }

    setSaving(true);
    try {
      const d = await apiRenameCol(activeFile, oldName, raw);
      setHeaders(d.headers);
      setRows(d.rows);
      showToast('ok', `Renamed "${oldName}" → "${raw}".`);
      if (activeFile === MASTER_FILE) await loadVillages(activeVlcode);
    } catch (e) {
      showToast('err', normalizeError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── hide a column only for the active village ─────────────────────────────
  // Triggered when a user blanks out a label in the card view. We intentionally
  // do NOT delete the column from the CSV — other villages may still hold
  // data in this column. Instead we clear this village's cell value and add
  // the column to the active village's hidden set so it disappears from this
  // card without touching anyone else.
  async function handleHideColumnForActiveVillage(rowIndex: number, col: string) {
    if (protectedHeaders.has(col)) {
      showToast('err', 'Cannot hide the primary key or name column.'); return;
    }
    const currentVal = (rows[rowIndex]?.[col] || '').trim();
    // Update local state first so the field disappears immediately even if the
    // save round-trip is slow.
    removePendingCol(col);
    setHiddenMap(prev => {
      const existing = prev[pendingKey] || [];
      if (existing.includes(col)) return prev;
      return { ...prev, [pendingKey]: [...existing, col] };
    });
    if (currentVal !== '') {
      // Persist the cell clear so this village no longer contributes a value.
      await handleCellChange(rowIndex, col, '');
    }
    showToast('ok', `"${col}" hidden for this village — other villages keep their data.`);
  }

  // ── delete column ────────────────────────────────────────────────────────
  async function handleDeleteColumn(col: string) {
    if (protectedHeaders.has(col)) {
      showToast('err', `Cannot delete primary key or name column.`); return;
    }
    const msg = `⚠️ DELETE COLUMN — NOT just this cell.\n\nColumn: "${col}"\nFile:   "${activeFile}"\n\nThis removes "${col}" from ALL villages permanently.\nIf you only want to hide it for the current village, blank out its label instead.\n\nProceed?`;
    if (!confirm(msg)) return;
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

  // ── download single CSV ───────────────────────────────────────────────────
  function handleDownloadFile(filename: string) {
    const a = document.createElement('a');
    a.href = `/api/admin/download-csv/${encodeURIComponent(filename)}`;
    a.download = filename;
    a.click();
  }

  // ── download master template ──────────────────────────────────────────────
  function handleDownloadTemplate() {
    const a = document.createElement('a');
    a.href = '/api/admin/master-template';
    a.download = 'master_template.csv';
    a.click();
  }

  // ── upload filled master CSV → distribute to all files ───────────────────
  async function handleMasterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!masterUploadRef.current) return;
    masterUploadRef.current.value = '';
    if (!file) return;

    if (!confirm(`Upload "${file.name}" as master CSV?\n\nData will be distributed into all matching CSV files automatically.`)) return;

    setMasterUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/master-import', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || 'Upload failed.');
      showToast('ok', d.message || `Distributed to ${d.totalFiles} file(s).`);
      // Reload current view
      await loadVillages(activeVlcode);
      if (isMasterView) await loadMasterView();
      else await loadFile(activeFile);
    } catch (err) {
      showToast('err', normalizeError(err instanceof Error ? err.message : String(err)));
    } finally {
      setMasterUploading(false);
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

  // ── filter rows by active village for non-master, village-scoped files ────
  // Files like Emission_Factors.csv don't have a VL_CODE column — those are
  // global reference data, so we show ALL rows regardless of active village.

  const visibleRows = !isVillageScoped
    ? rows
    : rows.filter((r) => !activeVlcode || r[filePkCol] === activeVlcode || r[filePkCol] === '');

  const visibleRowIndices = !isVillageScoped
    ? rows.map((_, i) => i)
    : rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !activeVlcode || r[filePkCol] === activeVlcode || r[filePkCol] === '')
        .map(({ i }) => i);

  const visibleHeaders = isMasterFile
    ? headers
    : isVillageScoped
      ? headers.filter((h) => !protectedHeaders.has(h))
      : headers;

  // ── master view: group columns by file, optionally filter ─────────────────
  const masterFilesPresent = Array.from(new Set(masterColumns.filter(c => !c.isIdentity).map(c => c.file)));
  const filteredMasterCols = masterFilterFile
    ? masterColumns.filter(c => c.isIdentity || c.file === masterFilterFile)
    : masterColumns;

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

      {/* hidden file inputs */}
      <input ref={uploadInputRef}  type="file" accept=".csv" className="hidden" onChange={handleUploadCSV} />
      <input ref={masterUploadRef} type="file" accept=".csv" className="hidden" onChange={handleMasterUpload} />

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
      </div>

      {/* ── BODY ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── FILE SIDEBAR ── */}
        <aside className="flex w-52 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Data Files</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">

            {/* Master View entry — always first */}
            <button
              onClick={() => setActiveFile(MASTER_VIEW_ID)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition ${
                isMasterView
                  ? 'bg-violet-50 font-semibold text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isMasterView ? 'bg-violet-500' : 'bg-slate-300'}`} />
              <span className="truncate">Master View</span>
              <span className="ml-auto rounded bg-violet-100 px-1 py-0.5 text-[9px] font-bold text-violet-600">ALL</span>
            </button>

            {files.map((f) => {
              const isActive = activeFile === f;
              const isMaster = f === MASTER_FILE;
              return (
                <div key={f} className="group flex items-center">
                  <button
                    onClick={() => setActiveFile(f)}
                    disabled={!isMaster && villages.length === 0}
                    className={`flex flex-1 items-center gap-2 px-4 py-2.5 text-left text-xs transition ${
                      isActive
                        ? 'bg-emerald-50 font-semibold text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    } ${!isMaster && villages.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="truncate">{fileLabel(f)}</span>
                    {isMaster && (
                      <span className="ml-auto rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-600">KEY</span>
                    )}
                  </button>
                  {/* per-file download button — shows on hover */}
                  <button
                    onClick={() => handleDownloadFile(f)}
                    title={`Download ${f}`}
                    className="mr-2 hidden rounded px-1.5 py-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 group-hover:block"
                  >
                    ↓
                  </button>
                </div>
              );
            })}
          </nav>

          {/* ── MASTER CSV PANEL ── */}
          <div className="border-t border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Master CSV</p>
            <button
              onClick={handleDownloadTemplate}
              className="flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition"
            >
              <span>↓</span> Download Template
            </button>
            <button
              onClick={() => masterUploadRef.current?.click()}
              disabled={masterUploading}
              className="flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50"
            >
              <span>↑</span> {masterUploading ? 'Uploading…' : 'Upload & Distribute'}
            </button>
            <p className="text-[10px] text-slate-400 leading-snug">
              Fill the template and upload — data goes into all CSVs automatically.
            </p>
          </div>

          {villages.length === 0 && (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
              Add a village first to unlock other files.
            </div>
          )}
        </aside>

        {/* ── TABLE AREA ── */}
        <main className="flex min-w-0 flex-1 flex-col">

          {isMasterView ? (
            /* ── MASTER VIEW ── */
            <>
              {/* master toolbar */}
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800">Master View</span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                    {masterLoading ? '…' : `${masterRows.length} village${masterRows.length !== 1 ? 's' : ''} · ${filteredMasterCols.length} col${filteredMasterCols.length !== 1 ? 's' : ''}`}
                  </span>
                  <span className="text-[11px] text-slate-400">All CSV attributes in one view · click any cell to edit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Filter by file:</span>
                  <select
                    value={masterFilterFile}
                    onChange={(e) => setMasterFilterFile(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium outline-none focus:border-violet-400"
                  >
                    <option value="">All files</option>
                    {masterFilesPresent.map(f => (
                      <option key={f} value={f}>{fileLabel(f)}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleDownloadTemplate}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700"
                  >
                    ↓ Template
                  </button>
                  <button
                    onClick={() => masterUploadRef.current?.click()}
                    disabled={masterUploading}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {masterUploading ? 'Uploading…' : '↑ Upload CSV'}
                  </button>
                  <button
                    onClick={loadMasterView}
                    disabled={masterLoading}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                  >
                    {masterLoading ? 'Loading…' : '↺ Refresh'}
                  </button>
                </div>
              </div>

              {/* master table */}
              <div className="flex-1 overflow-auto">
                {masterLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading master view…</div>
                ) : masterRows.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No village data found.</div>
                ) : (
                  <table className="min-w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10">
                      {/* File group header row */}
                      <tr className="bg-slate-700 text-white text-[10px]">
                        <th className="w-10 px-3 py-1.5 text-slate-400">#</th>
                        {(() => {
                          const groups: { file: string; count: number }[] = [];
                          for (const col of filteredMasterCols) {
                            const label = col.isIdentity ? 'Village ID' : fileLabel(col.file);
                            if (groups.length === 0 || groups[groups.length - 1].file !== label) {
                              groups.push({ file: label, count: 1 });
                            } else {
                              groups[groups.length - 1].count++;
                            }
                          }
                          return groups.map((g, i) => (
                            <th key={i} colSpan={g.count}
                              className={`px-3 py-1.5 font-semibold uppercase tracking-widest border-l border-slate-600 ${
                                g.file === 'Village ID' ? 'text-sky-300' : 'text-violet-300'
                              }`}>
                              {g.file}
                            </th>
                          ));
                        })()}
                      </tr>
                      {/* Column name row */}
                      <tr className="bg-slate-800 text-white">
                        <th className="w-10 px-3 py-2.5 text-[10px] font-semibold text-slate-400">#</th>
                        {filteredMasterCols.map((col, i) => {
                          const { prefix, label } = parseColPrefix(col.col);
                          return (
                            <th key={col.key}
                              className={`whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide ${
                                i === 0 || (i > 0 && filteredMasterCols[i - 1]?.file !== col.file && !col.isIdentity)
                                  ? 'border-l border-slate-600'
                                  : ''
                              }`}>
                              <div className="flex flex-col gap-0.5">
                                {prefix && (
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${
                                    prefix === 'before' ? 'text-amber-400' : 'text-emerald-400'
                                  }`}>
                                    {prefix}
                                  </span>
                                )}
                                <span>{label}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {masterRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-[11px] font-bold text-slate-400">{rowIdx + 1}</td>
                          {filteredMasterCols.map((col, colIdx) => (
                            <td key={col.key}
                              className={`px-3 py-1.5 ${
                                colIdx === 0 || (colIdx > 0 && filteredMasterCols[colIdx - 1]?.file !== col.file && !col.isIdentity)
                                  ? 'border-l border-slate-100'
                                  : ''
                              }`}>
                              <EditCell
                                value={row[col.key] || ''}
                                locked={col.isIdentity}
                                onChange={(val) => handleMasterCellChange(rowIdx, col.key, val)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            /* ── INDIVIDUAL FILE VIEW ── */
            <>
              {/* table toolbar */}
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800">{activeFile}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {loading ? '…' : (() => {
                      // For non-master files in card view we only render headers
                      // that this village has a value for (plus pending ones).
                      // Reflect that filtered count in the toolbar so users don't
                      // see "8 cols" when only 7 actually show up.
                      const shownColCount = isMasterFile
                        ? visibleHeaders.length
                        : visibleRows.reduce((max, row) => {
                            const c = visibleHeaders.filter(h => {
                              if (hiddenCols.has(h) && (row[h] || '').trim() === '') return false;
                              return (row[h] || '').trim() !== '' || pendingCols.has(h);
                            }).length;
                            return Math.max(max, c);
                          }, 0);
                      return `${visibleRows.length} row${visibleRows.length !== 1 ? 's' : ''} · ${shownColCount} col${shownColCount !== 1 ? 's' : ''}`;
                    })()}
                  </span>
                  {!isMasterFile && activeVillage && (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      {activeVillage[VL_NAME]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile(activeFile)}
                    title={`Download ${activeFile}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                  >
                    ↓ Download
                  </button>
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
                  {isMasterFile && (
                    <button
                      onClick={handleAddRow}
                      disabled={saving}
                      title="Add a new row"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      + Row
                    </button>
                  )}
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
                  isMasterFile ? (
                    <table className="min-w-full border-collapse text-left">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-800 text-white">
                          <th className="w-10 px-3 py-2.5 text-[10px] font-semibold text-slate-400">#</th>
                          {visibleHeaders.map((h) => {
                            const isProtected = protectedHeaders.has(h);
                            return (
                              <th key={h} className="group whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
                                <div className="flex items-center gap-1.5">
                                  <LabelEditor
                                    name={h}
                                    display={toLabel(h)}
                                    disabled={isProtected}
                                    onRename={(newName) => handleRenameColumn(h, newName)}
                                    onDelete={() => handleDeleteColumn(h)}
                                  />
                                  {!isProtected && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteColumn(h)}
                                      title={`Delete column "${h}" from ALL rows`}
                                      className="hidden rounded px-1 py-0.5 text-[9px] font-bold text-red-300 opacity-0 transition hover:bg-red-800 hover:text-red-100 group-hover:block group-hover:opacity-100"
                                    >
                                      x
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
                              No rows yet - click "+ Row" to add one.
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
                                    x
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  ) : visibleRows.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No rows yet - click "+ Row" to add one.
                    </div>
                  ) : (
                    <div className="space-y-4 p-4">
                      {visibleRows.map((row, visIdx) => {
                        const realIdx = visibleRowIndices[visIdx];
                        // Per-village filter: show only fields this village
                        //   • has a non-empty value for, OR
                        //   • the user just added in this session (pending).
                        // Exclude any column explicitly marked hidden for this
                        // village (so phantom headers added by another village
                        // don't leak into this card).
                        const cardHeaders = visibleHeaders.filter(h => {
                          if (hiddenCols.has(h) && (row[h] || '').trim() === '') return false;
                          return (row[h] || '').trim() !== '' || pendingCols.has(h);
                        });
                        return (
                          <section key={`${activeFile}-${realIdx}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                            <div className="divide-y divide-slate-100">
                              {cardHeaders.length === 0 && (
                                <div className="px-4 py-6 text-center text-xs text-slate-400">
                                  No data for this village yet — click <span className="font-semibold">+ Column</span> to add a field.
                                </div>
                              )}
                              {cardHeaders.map((h) => (
                                <div key={h} className="grid gap-2 px-4 py-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <LabelEditor
                                      name={h}
                                      display={toLabel(h)}
                                      disabled={protectedHeaders.has(h)}
                                      onRename={(newName) => handleRenameColumn(h, newName)}
                                      onDelete={() => handleHideColumnForActiveVillage(realIdx, h)}
                                    />
                                    {(row[h] || '').trim() !== '' && (
                                      <button
                                        type="button"
                                        onClick={() => handleCellChange(realIdx, h, '')}
                                        title={`Clear this village's value for "${h}"`}
                                        aria-label={`Clear ${h} for this village`}
                                        className="flex h-5 w-5 items-center justify-center rounded-full border border-red-200 text-[11px] font-bold leading-none text-red-400 hover:bg-red-50 hover:text-red-700"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                  <EditCell
                                    value={row[h] || ''}
                                    locked={false}
                                    onChange={(val) => handleCellChange(realIdx, h, val)}
                                  />
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── ADD VILLAGE MODAL ── */}
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

            {needsCategory && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-700">Category</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Pick where this column belongs.</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewColCategory('before')}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      newColCategory === 'before'
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Existing
                    <span className="mt-0.5 block text-[9px] font-normal text-slate-500">before_*</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewColCategory('after')}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      newColCategory === 'after'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Added
                    <span className="mt-0.5 block text-[9px] font-normal text-slate-500">after_*</span>
                  </button>
                </div>
              </div>
            )}

            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              placeholder="e.g. solar_panels_count"
              autoFocus
              disabled={needsCategory && !newColCategory}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              {needsCategory && newColCategory
                ? <>Will be saved as <span className="font-mono font-semibold text-slate-600">{newColCategory}_{newColName.trim().replace(/\s+/g, '_').toLowerCase() || '…'}</span></>
                : 'Use lowercase with underscores. Spaces will be converted automatically.'}
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={handleAddColumn} disabled={saving || !newColName.trim() || (needsCategory && !newColCategory)}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? 'Adding…' : 'Add Column'}
              </button>
              <button onClick={() => { setShowAddCol(false); setNewColName(''); setNewColCategory(null); }}
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

