import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Header, Record, ValidationError } from './types/records';
import { AuthState } from './types/auth';
import { RecordForm } from './components/RecordForm';
import { RecordsTable } from './components/RecordsTable';
import { RecordModal } from './components/RecordModal';
import { BulkEditModal } from './components/BulkEditModal';
import { RestartConfirmModal } from './components/RestartConfirmModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { HistoryModal } from './components/HistoryModal';
import { LoginForm } from './components/LoginForm';
import { AdminLoginForm } from './components/AdminLoginForm';
import { AdminDashboard } from './components/AdminDashboard';
import { SearchBar } from './components/SearchBar';
import { SequenceIntegrityMonitor } from './components/SequenceIntegrityMonitor';
import { AdvancedFilterPanel, FilterCriteria, emptyFilter, isFilterActive } from './components/AdvancedFilterPanel';
import { AppShell } from './components/AppShell';
import { ContextCard } from './components/ContextCard';
import { ValidationStatus } from './components/ValidationStatus';
import { SummaryMetrics } from './components/SummaryMetrics';
import { ActionToolbar } from './components/ActionToolbar';
import { RecordDetailDrawer } from './components/RecordDetailDrawer';
import { ImportDialog } from './components/ImportDialog';
import { Toast, useToast } from './components/Toast';
import { generateDemoRecords } from './utils/demoData';
import { generateXML, downloadXML, formatDateForXML } from './utils/xmlGenerator';
import { importXMLFile } from './utils/xmlParser';
import { importExcelFile } from './utils/excelParser';
import { validateAll } from './utils/validation';
import {
  saveHeader,
  loadHeader,
  saveRecords,
  loadRecords,
  loadPrefillEnabled,
  clearAllData,
} from './utils/storage';
import {
  signIn,
  signOut,
  getCurrentAuthUser,
} from './services/authService';
import { supabase } from './lib/supabase';
import {
  saveHeaderToDatabase,
  getHeaderFromDatabase,
  getRecordsFromDatabase,
  deleteRecordFromDatabase,
  deleteAllUserRecords,
  subscribeToUserRecords,
  subscribeToUserHeader,
  upsertRecordsBatch,
  saveSnapshot,
} from './lib/database';

const recordsPerPage = 20;
const ADMIN_EMAIL = 'admin@kumulativne.local';

function App() {
  const sortRecordsBySequence = (recordsList: Record[]): Record[] => {
    return [...recordsList].sort((a, b) => {
      const seqA = a.sequence_number ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.sequence_number ?? Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) return seqA - seqB;
      return a.id.localeCompare(b.id);
    });
  };

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isAdmin: false
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const [header, setHeader] = useState<Header>(loadHeader());
  const [records, setRecords] = useState<Record[]>([]);
  const [allRecords, setAllRecords] = useState<Record[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [prefillEnabled] = useState<boolean>(loadPrefillEnabled());
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number>(-1);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'forms'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState<boolean>(false);
  const [isRestartingIds, setIsRestartingIds] = useState<boolean>(false);
  const [isValidatingIds, setIsValidatingIds] = useState<boolean>(false);
  const [externalIdMessage, setExternalIdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [drawerRecord, setDrawerRecord] = useState<Record | null>(null);
  const [drawerIndex, setDrawerIndex] = useState<number>(-1);
  const { toasts, addToast, dismissToast } = useToast();
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [advancedFilter, setAdvancedFilter] = useState<FilterCriteria>(emptyFilter());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const pendingSync = useRef(false);
  const realtimeUnsub = useRef<(() => void) | null>(null);
  const headerUnsub = useRef<(() => void) | null>(null);
  const suppressSyncCount = useRef(0);
  const suppressRealtimeUntil = useRef(0);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      if (pendingSync.current && dbUserId) {
        syncToDatabase(dbUserId);
      }
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [dbUserId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const user = await getCurrentAuthUser();
      if (!mounted) return;

      if (user) {
        if (user.email === ADMIN_EMAIL) {
          setAuthState({ isAuthenticated: true, user: null, isAdmin: true });
        } else {
          setDbUserId(user.id);
          setAuthState({ isAuthenticated: true, user, isAdmin: false });
          await loadUserData(user.id);
        }
      }
      setAuthLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        if (dbSyncTimer.current) {
          clearTimeout(dbSyncTimer.current);
          dbSyncTimer.current = null;
        }
        cleanupRealtime();
        setAuthState({ isAuthenticated: false, user: null, isAdmin: false });
        setAllRecords([]);
        setRecords([]);
        setHeader({
          cumulative_reason_code: 'PO07',
          budget_year: new Date().getFullYear().toString(),
          budget_user_id: '',
          currency_code: 'RSD',
          treasury: ''
        });
        setDbUserId(null);
        suppressSyncCount.current = 5;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      cleanupRealtime();
    };
  }, []);

  function cleanupRealtime() {
    if (realtimeUnsub.current) {
      realtimeUnsub.current();
      realtimeUnsub.current = null;
    }
    if (headerUnsub.current) {
      headerUnsub.current();
      headerUnsub.current = null;
    }
  }

  async function loadUserData(userId: string) {
    try {
      setIsSyncing(true);
      const [dbHeader, dbRecords] = await Promise.all([
        getHeaderFromDatabase(userId),
        getRecordsFromDatabase(userId)
      ]);

      if (dbRecords.length > 0) {
        let sorted = sortRecordsBySequence(dbRecords);
        suppressSyncCount.current = 4;
        setAllRecords(sorted);
        setRecords(sorted);
        saveRecords(sorted, userId);
        if (dbHeader) {
          setHeader(dbHeader);
          saveHeader(dbHeader, userId);
        }
      } else {
        const cachedRecords = sortRecordsBySequence(loadRecords(userId));
        const cachedHeader = loadHeader(userId);
        if (cachedRecords.length > 0) {
          suppressSyncCount.current = 4;
          const hid = await saveHeaderToDatabase(userId, cachedHeader);
          await upsertRecordsBatch(userId, hid, cachedRecords);
          setAllRecords(cachedRecords);
          setRecords(cachedRecords);
          setHeader(dbHeader ?? cachedHeader);
          saveHeader(dbHeader ?? cachedHeader, userId);
        } else if (dbHeader) {
          setHeader(dbHeader);
          saveHeader(dbHeader, userId);
        }
      }

      setupRealtime(userId);
    } catch (err) {
      console.error('loadUserData error:', err);
      const cached = sortRecordsBySequence(loadRecords(userId));
      setAllRecords(cached);
      setRecords(cached);
    } finally {
      setIsSyncing(false);
    }
  }

  function setupRealtime(userId: string) {
    cleanupRealtime();

    realtimeUnsub.current = subscribeToUserRecords(userId, (updated) => {
      if (Date.now() < suppressRealtimeUntil.current) return;

      const sorted = sortRecordsBySequence(updated);
      let accepted = false;
      setAllRecords(prev => {
        const prevIds = prev.map(r => r.id).sort().join(',');
        const sortedIds = sorted.map(r => r.id).sort().join(',');
        if (prevIds !== sortedIds) {
          saveRecords(sorted, userId);
          accepted = true;
          return sorted;
        }
        return prev;
      });
      if (accepted) {
        setRecords(searchQuery ? filterRecords(sorted, searchQuery) : sorted);
      }
    });

    headerUnsub.current = subscribeToUserHeader(userId, (updatedHeader) => {
      if (updatedHeader) {
        setHeader(updatedHeader);
        saveHeader(updatedHeader, userId);
      }
    });
  }

  const dbUserIdRef = useRef(dbUserId);
  useEffect(() => { dbUserIdRef.current = dbUserId; }, [dbUserId]);

  async function syncToDatabase(userId: string) {
    if (!isOnline) {
      pendingSync.current = true;
      return;
    }
    if (dbUserIdRef.current !== userId) return;
    const current = allRecordsRef.current;
    if (current.length === 0) return;

    try {
      setIsSyncing(true);
      const hid = await saveHeaderToDatabase(userId, headerRef.current);
      await upsertRecordsBatch(userId, hid, current);
      pendingSync.current = false;
      setSyncMessage('Podaci sinhronizovani');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      console.error('syncToDatabase error:', err);
      pendingSync.current = true;
    } finally {
      setIsSyncing(false);
    }
  }

  const allRecordsRef = useRef(allRecords);
  const headerRef = useRef(header);
  useEffect(() => { allRecordsRef.current = allRecords; }, [allRecords]);
  useEffect(() => { headerRef.current = header; }, [header]);

  const dbSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!authState.user || !dbUserId) return;
    if (allRecords.length === 0) return;

    saveRecords(allRecords, dbUserId);
    saveHeader(header, dbUserId);

    if (suppressSyncCount.current > 0) {
      suppressSyncCount.current--;
      return;
    }

    if (isOnline) {
      if (dbSyncTimer.current) clearTimeout(dbSyncTimer.current);
      dbSyncTimer.current = setTimeout(() => {
        syncToDatabase(dbUserId);
      }, 1500);
    } else {
      pendingSync.current = true;
    }
  }, [allRecords, header, authState.user, dbUserId, isOnline]);

  const handleUserLogin = async (email: string, password: string) => {
    try {
      setAuthError('');
      if (dbSyncTimer.current) {
        clearTimeout(dbSyncTimer.current);
        dbSyncTimer.current = null;
      }
      cleanupRealtime();
      setAllRecords([]);
      setRecords([]);
      setDbUserId(null);
      suppressSyncCount.current = 5;
      const user = await signIn(email, password);
      setDbUserId(user.id);
      setAuthState({ isAuthenticated: true, user, isAdmin: false });
      await loadUserData(user.id);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Greška pri prijavi');
    }
  };

  const handleAdminLogin = async (credentials: { username: string; password: string }) => {
    try {
      setAuthError('');
      await signIn(ADMIN_EMAIL, credentials.password);
      setAuthState({ isAuthenticated: true, user: null, isAdmin: true });
      setShowAdminLogin(false);
    } catch {
      setAuthError('Neispravni admin podaci.');
    }
  };

  const handleLogout = async () => {
    try {
      if (dbUserId && pendingSync.current) {
        await syncToDatabase(dbUserId);
      }
    } catch (err) {
      console.error('Logout sync error:', err);
    }

    if (dbSyncTimer.current) {
      clearTimeout(dbSyncTimer.current);
      dbSyncTimer.current = null;
    }
    cleanupRealtime();

    try {
      await signOut();
      clearAllData(dbUserId ?? undefined);
    } catch (err) {
      console.error('signOut error:', err);
    }

    setAuthState({ isAuthenticated: false, user: null, isAdmin: false });
    setShowAdminLogin(false);
    setAuthError('');
    setAllRecords([]);
    setRecords([]);
    setSearchQuery('');
    setCurrentPage(1);
    setErrors([]);
    setShowDrawer(false);
    setDrawerRecord(null);
    setDrawerIndex(-1);
    setHeader({
      cumulative_reason_code: 'PO07',
      budget_year: new Date().getFullYear().toString(),
      budget_user_id: '',
      currency_code: 'RSD',
      treasury: ''
    });
    setDbUserId(null);
    pendingSync.current = false;
  };

  const createEmptyRecord = (): Record => ({
    id: crypto.randomUUID(),
    reason_code: '',
    external_id: '',
    recipient: '',
    recipient_place: '',
    account_number: '',
    invoice_number: '',
    invoice_type: '',
    invoice_date: '',
    due_date: '',
    contract_number: '',
    payment_code: '',
    credit_model: '',
    credit_reference_number: '',
    payment_basis: '',
    notes: '',
    class_group: '',
    item: {
      budget_user_id: '',
      program_code: '',
      project_code: '',
      economic_classification_code: '',
      source_of_funding_code: '',
      function_code: '',
      amount: 0,
      recording_account: '',
      expected_payment_date: '',
      urgent_payment: false,
      posting_account: ''
    }
  });

  const createPrefillRecord = (lastRecord: Record): Record => {
    const newRecord = createEmptyRecord();
    if (prefillEnabled && lastRecord) {
      return {
        ...newRecord,
        reason_code: lastRecord.reason_code,
        recipient_place: lastRecord.recipient_place,
        invoice_number: lastRecord.invoice_number,
        invoice_type: lastRecord.invoice_type,
        invoice_date: lastRecord.invoice_date,
        due_date: lastRecord.due_date,
        contract_number: lastRecord.contract_number,
        payment_code: lastRecord.payment_code,
        credit_model: lastRecord.credit_model,
        credit_reference_number: lastRecord.credit_reference_number,
        payment_basis: lastRecord.payment_basis,
        notes: '',
        class_group: '',
        item: { ...lastRecord.item }
      };
    }
    return newRecord;
  };

  const addRecords = (count: number = 1) => {
    const lastRecord = allRecords[allRecords.length - 1];
    const newRecords = [];
    for (let i = 0; i < count; i++) {
      const newRecord = lastRecord ? createPrefillRecord(lastRecord) : createEmptyRecord();
      newRecords.push({ ...newRecord, sequence_number: allRecords.length + i + 1 });
    }

    const updatedRecords = sortRecordsBySequence([...allRecords, ...newRecords]);
    setAllRecords(updatedRecords);
    setRecords(updatedRecords);
    setSearchQuery('');
    setErrors([]);

    const lastPage = Math.ceil(updatedRecords.length / recordsPerPage);
    setCurrentPage(lastPage);
  };

  const filterRecords = useCallback((recordsList: Record[], query: string) => {
    if (!query.trim()) return recordsList;
    const lowerQuery = query.toLowerCase().trim();
    return recordsList.filter(record => {
      const fields = [
        record.recipient, record.invoice_number, record.account_number,
        record.external_id, record.recipient_place, record.reason_code,
        record.contract_number, record.payment_basis, record.notes,
        record.class_group,
        record.item?.program_code, record.item?.economic_classification_code,
        String(record.item?.amount || '')
      ];
      return fields.some(f => String(f || '').toLowerCase().includes(lowerQuery));
    });
  }, []);

  const updateRecord = (_index: number, updatedRecord: Record) => {
    const newAllRecords = [...allRecords];
    const actualIndex = allRecords.findIndex(r => r.id === updatedRecord.id);
    if (actualIndex >= 0) {
      newAllRecords[actualIndex] = updatedRecord;
      const sorted = sortRecordsBySequence(newAllRecords);
      setAllRecords(sorted);
      setRecords(searchQuery ? filterRecords(sorted, searchQuery) : sorted);
    }
    setErrors([]);
  };

  const handleEditRecord = (index: number) => {
    setSelectedRecordIndex(index);
    setEditingRecord({ ...records[index] });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSaveRecord = () => {
    if (editingRecord && selectedRecordIndex >= 0) {
      updateRecord(selectedRecordIndex, editingRecord);
      setShowModal(false);
      setEditingRecord(null);
      setSelectedRecordIndex(-1);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    setSelectedRecordIndex(-1);
  };

  const removeRecord = (index: number) => {
    if (confirm('Da li ste sigurni da želite da obrišete ovaj zapis?')) {
      const recordToRemove = records[index];
      const newAllRecords = allRecords.filter(r => r.id !== recordToRemove.id);
      const sorted = sortRecordsBySequence(newAllRecords);
      setAllRecords(sorted);
      setRecords(searchQuery ? filterRecords(sorted, searchQuery) : sorted);
      setErrors([]);

      if (dbUserId && isOnline) {
        deleteRecordFromDatabase(recordToRemove.id).catch(console.error);
      }
    }
  };

  const clearAll = async () => {
    setShowDeleteConfirm(false);
    setRecords([]);
    setAllRecords([]);
    setSearchQuery('');
    setErrors([]);
    clearAllData(dbUserId ?? undefined);

    if (dbUserId && isOnline) {
      try {
        await deleteAllUserRecords(dbUserId);
      } catch (err) {
        console.error('clearAll DB error:', err);
      }
    }
  };

  const handleExport = () => {
    const validationErrors = validateAll(header, allRecords);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

    const today = new Date().toISOString().split('T')[0];
    const zeroAmounts = allRecords.filter(r => r.item.amount === 0).length;
    const overdue = allRecords.filter(r => r.due_date && r.due_date < today).length;
    const warnings: string[] = [];
    if (zeroAmounts > 0) warnings.push(`${zeroAmounts} zapis${zeroAmounts !== 1 ? 'a' : ''} ima iznos 0.00`);
    if (overdue > 0) warnings.push(`${overdue} zapis${overdue !== 1 ? 'a' : ''} ima prošli datum dospeća`);

    if (warnings.length > 0) {
      const proceed = confirm(
        `Upozorenje pre izvoza:\n\n${warnings.join('\n')}\n\nDa li svejedno želite da izvezete?`
      );
      if (!proceed) return;
    }

    const xml = generateXML(header, allRecords);
    const filename = `commitments_${new Date().toISOString().split('T')[0]}.xml`;
    downloadXML(xml, filename);
  };

  const handleExportPDF = () => {
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const getHeaderTitle = () => {
      const budgetUserId = header.budget_user_id || (authState.user?.budget_user_id) || '';
      const titleMap: { [key: string]: string } = {
        '02126': 'ETS-Pristina', '02127': 'ETS-Mitrovica', '02128': 'ETS-Pec',
        '02129': 'ETS-Prizren', '02130': 'ETS-Gnjilane', '02131': 'ETS-Kosovska Mitrovica'
      };
      return titleMap[budgetUserId] || 'ETS';
    };

    const fmtDate = (d: string) => {
      if (!d) return '-';
      try { return new Date(d).toLocaleDateString('sr-RS'); } catch { return d; }
    };

    const fmtAmount = (n: number) =>
      n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getDisplayNumber = (record: Record, fallbackIndex: number) => {
      if (record.sequence_number !== undefined && record.sequence_number !== null) {
        return record.sequence_number;
      }
      return fallbackIndex + 1;
    };

    const sortedForPdf = sortRecordsBySequence(allRecords);
    const totalAmount = sortedForPdf.reduce((s, r) => s + r.item.amount, 0);
    const urgentCount = sortedForPdf.filter(r => r.item.urgent_payment).length;

    const printContent = `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(getHeaderTitle())} - ${escapeHtml(new Date().toLocaleDateString('sr-RS'))}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; color: #1f2937; background: #e5e7eb; }
    .page { max-width: 297mm; margin: 0 auto; background: white; padding: 25px 30px; min-height: 100vh; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px; }
    .doc-title h1 { font-size: 22px; color: #1e3a8a; margin-bottom: 4px; }
    .doc-title p { font-size: 12px; color: #6b7280; }
    .doc-meta { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.6; }
    .doc-meta strong { color: #374151; }
    .user-bar { display: flex; gap: 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; }
    .user-bar .item { display: flex; flex-direction: column; }
    .user-bar .item label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .user-bar .item span { font-weight: 600; color: #1e3a8a; }
    .header-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
    .header-card { padding: 10px 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
    .header-card label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
    .header-card span { font-size: 13px; font-weight: 500; color: #111827; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead th { background: #1e3a8a; color: white; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; border: 1px solid #1e3a8a; position: sticky; top: 0; }
    tbody td { border: 1px solid #d1d5db; padding: 6px 6px; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:hover { background: #eff6ff; }
    .num { text-align: center; font-weight: 600; color: #1e3a8a; }
    .amount { text-align: right; font-weight: 600; white-space: nowrap; }
    .urgent-yes { background: #fef2f2 !important; color: #dc2626; font-weight: 700; text-align: center; }
    .urgent-no { color: #9ca3af; text-align: center; }
    .summary-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 16px 20px; background: linear-gradient(135deg, #1e3a8a, #1e40af); border-radius: 8px; color: white; }
    .summary-bar .stat { text-align: center; }
    .summary-bar .stat label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; display: block; margin-bottom: 4px; }
    .summary-bar .stat span { font-size: 18px; font-weight: 700; }
    .summary-bar .divider { width: 1px; height: 36px; background: rgba(255,255,255,0.3); }
    .footer { margin-top: 25px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    .no-print { position: fixed; bottom: 24px; right: 24px; display: flex; gap: 10px; z-index: 100; }
    .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
    .btn-primary { background: #1e40af; color: white; }
    .btn-primary:hover { background: #1e3a8a; }
    .btn-secondary { background: #6b7280; color: white; }
    .btn-secondary:hover { background: #4b5563; }
    @media print {
      body { background: white; }
      .page { max-width: none; margin: 0; padding: 15px; }
      .no-print { display: none; }
      thead th { position: static; }
      table { font-size: 9px; }
      tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
      .urgent-yes { -webkit-print-color-adjust: exact; color-adjust: exact; }
      .summary-bar { -webkit-print-color-adjust: exact; color-adjust: exact; }
      thead th { -webkit-print-color-adjust: exact; color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="doc-header">
      <div class="doc-title">
        <h1>${escapeHtml(getHeaderTitle())}</h1>
        <p>Kumulativne obaveze — Pregled zapisa za XML izvoz</p>
      </div>
      <div class="doc-meta">
        <p><strong>Datum izvoza:</strong> ${escapeHtml(new Date().toLocaleDateString('sr-RS'))}</p>
        <p><strong>Vreme:</strong> ${escapeHtml(new Date().toLocaleTimeString('sr-RS'))}</p>
      </div>
    </div>

    ${authState.user ? `<div class="user-bar">
      <div class="item"><label>Korisnik</label><span>${escapeHtml(authState.user.pdf_display_name || authState.user.username)}</span></div>
      <div class="item"><label>Budžet</label><span>${escapeHtml(authState.user.budget_user_id)}</span></div>
      <div class="item"><label>Trezor</label><span>${escapeHtml(authState.user.treasury)}</span></div>
    </div>` : ''}

    <div class="header-grid">
      <div class="header-card"><label>Kum. kod razloga</label><span>${escapeHtml(header.cumulative_reason_code || '-')}</span></div>
      <div class="header-card"><label>Budžetska godina</label><span>${escapeHtml(header.budget_year || '-')}</span></div>
      <div class="header-card"><label>ID kor. budžeta</label><span>${escapeHtml(header.budget_user_id || '-')}</span></div>
      <div class="header-card"><label>Kod valute</label><span>${escapeHtml(header.currency_code || '-')}</span></div>
      <div class="header-card"><label>Trezor</label><span>${escapeHtml(header.treasury || '-')}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:32px;">#</th>
          <th style="width:60px;">Kod raz.</th>
          <th style="width:70px;">Spolj. ID</th>
          <th>Primalac</th>
          <th style="width:90px;">Broj računa</th>
          <th style="width:60px;">Br. fakt.</th>
          <th style="width:60px;">Dat. fakt.</th>
          <th style="width:60px;">Dat. dosp.</th>
          <th style="width:80px;">Iznos</th>
          <th style="width:50px;">Program</th>
          <th style="width:60px;">Ekon. klas.</th>
          <th style="width:32px;">Hitno</th>
        </tr>
      </thead>
      <tbody>
        ${sortedForPdf.map((record, index) => {
          return `<tr>
            <td class="num">${getDisplayNumber(record, index)}</td>
            <td>${escapeHtml(record.reason_code || '-')}</td>
            <td>${escapeHtml(record.external_id || 'auto')}</td>
            <td>${escapeHtml(record.recipient || '-')}</td>
            <td>${escapeHtml(record.account_number || '-')}</td>
            <td>${escapeHtml(record.invoice_number || '-')}</td>
            <td>${fmtDate(record.invoice_date)}</td>
            <td>${fmtDate(record.due_date)}</td>
            <td class="amount">${fmtAmount(record.item.amount)}</td>
            <td>${escapeHtml(record.item.program_code || '-')}</td>
            <td>${escapeHtml(record.item.economic_classification_code || '-')}</td>
            <td class="${record.item.urgent_payment ? 'urgent-yes' : 'urgent-no'}">${record.item.urgent_payment ? 'Da' : 'Ne'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <div class="summary-bar">
      <div class="stat"><label>Ukupno zapisa</label><span>${sortedForPdf.length}</span></div>
      <div class="divider"></div>
      <div class="stat"><label>Hitna plaćanja</label><span>${urgentCount}</span></div>
      <div class="divider"></div>
      <div class="stat"><label>Ukupan iznos</label><span>${fmtAmount(totalAmount)} ${escapeHtml(header.currency_code)}</span></div>
    </div>

    ${authState.user ? `<div class="footer">Generisao: ${escapeHtml(authState.user.username)} \vert{}${escapeHtml(new Date().toLocaleString('sr-RS'))}</div>` : ''}
  </div>

  <div class="no-print">
    <button onclick="window.print()" class="btn btn-primary">Štampaj</button>
    <button onclick="window.close()" class="btn btn-secondary">Zatvori</button>
  </div>
</body>
</html>`;

    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
      alert('Molimo dozvolite pop-up prozore za ovu stranicu.');
      URL.revokeObjectURL(blobUrl);
      return;
    }
    printWindow.addEventListener('load', () => {
      URL.revokeObjectURL(blobUrl);
    });
  };

  const handleImportXML = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xml')) {
      alert('Molimo odaberite XML fajl');
      return;
    }

    setIsImporting(true);
    setErrors([]);

    try {
      const parsedData = await importXMLFile(file);

      const shouldReplace = allRecords.length === 0 ||
        confirm(`Trenutno imate ${allRecords.length} zapisa. OK = zameni, Cancel = dodaj`);

      let finalRecords: Record[];
      let finalHeader: Header;

      suppressSyncCount.current = 2;

      if (shouldReplace) {
        finalHeader = parsedData.header;
        const withSeq = parsedData.records.map((r, i) => ({ ...r, sequence_number: i + 1 }));
        finalRecords = sortRecordsBySequence(withSeq);
        setHeader(finalHeader);
        setAllRecords(finalRecords);
        setRecords(finalRecords);
        setSearchQuery('');
        setCurrentPage(1);
      } else {
        finalHeader = header;
        const maxSeq = Math.max(...allRecords.map(r => r.sequence_number || 0), 0);
        const newRecs = parsedData.records.map((r, i) => ({
          ...r,
          id: crypto.randomUUID(),
          sequence_number: maxSeq + i + 1
        }));
        finalRecords = sortRecordsBySequence([...allRecords, ...newRecs]);
        setAllRecords(finalRecords);
        setRecords(finalRecords);
        setSearchQuery('');
        setCurrentPage(Math.ceil(finalRecords.length / recordsPerPage));
      }

      allRecordsRef.current = finalRecords;
      headerRef.current = finalHeader;

      saveRecords(finalRecords, dbUserId ?? undefined);
      saveHeader(finalHeader, dbUserId ?? undefined);

      if (dbUserId && isOnline) {
        if (dbSyncTimer.current) clearTimeout(dbSyncTimer.current);
        suppressRealtimeUntil.current = Date.now() + 10000;
        if (shouldReplace) {
          await deleteAllUserRecords(dbUserId);
        }
        const hid = await saveHeaderToDatabase(dbUserId, finalHeader);
        await upsertRecordsBatch(dbUserId, hid, finalRecords);
        suppressRealtimeUntil.current = Date.now() + 5000;
        const dateStr = new Date().toLocaleString('sr-RS');
        await saveSnapshot(
          dbUserId,
          `Import XML — ${file.name} (${dateStr})`,
          'import',
          finalRecords,
          finalHeader
        );
        setSyncMessage('Sačuvano u bazu');
        setTimeout(() => setSyncMessage(null), 3000);
      }

      setErrors([]);
      alert(`Uspešno učitano ${parsedData.records.length} zapisa!`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Import error:', error);
      alert(`Greška pri uvozu XML-a:\n\n${msg}\n\nProvjerite da li je XML fajl ispravan i pokušajte ponovo.`);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xls') && !lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xml')) {
      alert('Molimo odaberite Excel fajl (.xls ili .xlsx)');
      return;
    }

    setIsImporting(true);
    setErrors([]);

    try {
      const parsedData = await importExcelFile(file);

      const shouldReplace = allRecords.length === 0 ||
        confirm(`Trenutno imate ${allRecords.length} zapisa. OK = zameni, Cancel = dodaj`);

      let finalRecords: Record[];
      let finalHeader: Header;

      suppressSyncCount.current = 2;

      if (shouldReplace) {
        finalHeader = parsedData.header;
        const withSeq = parsedData.records.map((r, i) => ({
          ...r,
          sequence_number: r.sequence_number ?? i + 1,
        }));
        finalRecords = sortRecordsBySequence(withSeq);
        setHeader(finalHeader);
        setAllRecords(finalRecords);
        setRecords(finalRecords);
        setSearchQuery('');
        setCurrentPage(1);
      } else {
        finalHeader = header;
        const maxSeq = Math.max(...allRecords.map(r => r.sequence_number || 0), 0);
        const newRecs = parsedData.records.map((r, i) => ({
          ...r,
          id: crypto.randomUUID(),
          sequence_number: r.sequence_number ?? maxSeq + i + 1,
        }));
        finalRecords = sortRecordsBySequence([...allRecords, ...newRecs]);
        setAllRecords(finalRecords);
        setRecords(finalRecords);
        setSearchQuery('');
        setCurrentPage(Math.ceil(finalRecords.length / recordsPerPage));
      }

      allRecordsRef.current = finalRecords;
      headerRef.current = finalHeader;

      saveRecords(finalRecords, dbUserId ?? undefined);
      saveHeader(finalHeader, dbUserId ?? undefined);

      if (dbUserId && isOnline) {
        if (dbSyncTimer.current) clearTimeout(dbSyncTimer.current);
        suppressRealtimeUntil.current = Date.now() + 10000;
        if (shouldReplace) {
          await deleteAllUserRecords(dbUserId);
        }
        const hid = await saveHeaderToDatabase(dbUserId, finalHeader);
        await upsertRecordsBatch(dbUserId, hid, finalRecords);
        suppressRealtimeUntil.current = Date.now() + 5000;
        const dateStr = new Date().toLocaleString('sr-RS');
        await saveSnapshot(
          dbUserId,
          `Import Excel — ${file.name} (${dateStr})`,
          'import',
          finalRecords,
          finalHeader
        );
        setSyncMessage('Sačuvano u bazu');
        setTimeout(() => setSyncMessage(null), 3000);
      }

      setErrors([]);
      alert(`Uspešno učitano ${parsedData.records.length} zapisa iz Excel fajla!`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Excel import error:', error);
      alert(`Greška pri uvozu Excel fajla:\n\n${msg}\n\nProvjerite da li je fajl izvezen iz ove aplikacije i pokušajte ponovo.`);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleBulkEdit = (updates: any) => {
    const updatedRecords = allRecords.map(record => {
      const r = { ...record };
      if (updates.invoice_number !== undefined) r.invoice_number = updates.invoice_number;
      if (updates.invoice_type !== undefined) r.invoice_type = updates.invoice_type;
      if (updates.invoice_date !== undefined) r.invoice_date = formatDateForXML(updates.invoice_date);
      if (updates.due_date !== undefined) r.due_date = formatDateForXML(updates.due_date);
      if (updates.contract_number !== undefined) r.contract_number = updates.contract_number;
      if (updates.payment_basis !== undefined) r.payment_basis = updates.payment_basis;
      if (updates.expected_payment_date !== undefined) {
        r.item = { ...r.item, expected_payment_date: formatDateForXML(updates.expected_payment_date) };
      }
      return r;
    });

    const sorted = sortRecordsBySequence(updatedRecords);
    setAllRecords(sorted);
    setRecords(searchQuery ? filterRecords(sorted, searchQuery) : sorted);
    setErrors([]);
    alert(`Uspešno ažurirano ${Object.keys(updates).length} polja za ${allRecords.length} zapisa!`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    const base = query.trim() ? filterRecords(allRecords, query) : allRecords;
    setRecords(isFilterActive(advancedFilter) ? applyAdvancedFilter(base, advancedFilter) : base);
  };

  const applyAdvancedFilter = useCallback((list: Record[], f: FilterCriteria): Record[] => {
    return list.filter(r => {
      if (f.dateFrom && r.invoice_date < f.dateFrom) return false;
      if (f.dateTo && r.invoice_date > f.dateTo) return false;
      if (f.dueDateFrom && r.due_date < f.dueDateFrom) return false;
      if (f.dueDateTo && r.due_date > f.dueDateTo) return false;
      if (f.amountMin !== '' && r.item.amount < parseFloat(f.amountMin)) return false;
      if (f.amountMax !== '' && r.item.amount > parseFloat(f.amountMax)) return false;
      if (f.programCode && !r.item.program_code.toLowerCase().includes(f.programCode.toLowerCase())) return false;
      if (f.economicCode && !r.item.economic_classification_code.toLowerCase().includes(f.economicCode.toLowerCase())) return false;
      if (f.urgentOnly && !r.item.urgent_payment) return false;
      if (f.zeroAmountOnly && r.item.amount !== 0) return false;
      return true;
    });
  }, []);

  const handleAdvancedFilterChange = (f: FilterCriteria) => {
    setAdvancedFilter(f);
    setCurrentPage(1);
    const textFiltered = searchQuery.trim() ? filterRecords(allRecords, searchQuery) : allRecords;
    setRecords(isFilterActive(f) ? applyAdvancedFilter(textFiltered, f) : textFiltered);
  };

  const handleCloneRecord = (index: number) => {
    const source = records[index];
    const cloned: Record = {
      ...source,
      id: crypto.randomUUID(),
      external_id: '',
      invoice_number: '',
      sequence_number: allRecords.length + 1,
    };
    const updated = sortRecordsBySequence([...allRecords, cloned]);
    setAllRecords(updated);
    setRecords(searchQuery.trim() ? filterRecords(updated, searchQuery) : updated);
    const lastPage = Math.ceil(updated.length / recordsPerPage);
    setCurrentPage(lastPage);
  };

  const handleExportCSV = () => {
    const headers = [
      '#', 'Kod razloga', 'Spoljašnji ID', 'Primalac', 'Mesto primaoca',
      'Broj računa', 'Broj fakture', 'Tip fakture', 'Datum fakture', 'Datum dospeća',
      'Broj ugovora', 'Kod plaćanja', 'Model kredita', 'Ref. broj kredita', 'Osnov plaćanja',
      'ID korisnika budžeta', 'Kod programa', 'Kod projekta', 'Ekonomska klasifikacija',
      'Kod izvora finansiranja', 'Kod funkcije', 'Iznos', 'Račun evidentiranja',
      'Očekivani datum plaćanja', 'Hitno plaćanje', 'Račun knjiženja'
    ];

    const formatDate = (d: string) => {
      if (!d) return '';
      try { return new Date(d).toLocaleDateString('sr-RS'); } catch { return d; }
    };

    const rows = allRecords.map((r, i) => [
      i + 1, r.reason_code, r.external_id, r.recipient, r.recipient_place,
      r.account_number, r.invoice_number, r.invoice_type, formatDate(r.invoice_date), formatDate(r.due_date),
      r.contract_number, r.payment_code, r.credit_model, r.credit_reference_number, r.payment_basis,
      r.item.budget_user_id, r.item.program_code, r.item.project_code, r.item.economic_classification_code,
      r.item.source_of_funding_code, r.item.function_code, r.item.amount, r.item.recording_account,
      formatDate(r.item.expected_payment_date), r.item.urgent_payment ? 'Da' : 'Ne', r.item.posting_account
    ]);

    const escape = (v: string | number) => {
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zapisi_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const formatDate = (d: string) => {
      if (!d) return '';
      try { return new Date(d).toLocaleDateString('sr-RS'); } catch { return d; }
    };

    const sorted = sortRecordsBySequence(allRecords);
    const getDisplayNumber = (record: Record, fallbackIndex: number) => {
      if (record.sequence_number !== undefined && record.sequence_number !== null) {
        return record.sequence_number;
      }
      return fallbackIndex + 1;
    };

    const columns = [
      { header: '#', width: 50 },
      { header: 'Kod razloga', width: 80 },
      { header: 'Spoljašnji ID', width: 90 },
      { header: 'Primalac', width: 180 },
      { header: 'Mesto primaoca', width: 120 },
      { header: 'Broj računa', width: 120 },
      { header: 'Broj fakture', width: 90 },
      { header: 'Tip fakture', width: 70 },
      { header: 'Datum fakture', width: 80 },
      { header: 'Datum dospeća', width: 80 },
      { header: 'Broj ugovora', width: 90 },
      { header: 'Kod plaćanja', width: 70 },
      { header: 'Model kredita', width: 70 },
      { header: 'Ref. broj kredita', width: 100 },
      { header: 'Osnov plaćanja', width: 150 },
      { header: 'ID kor. budžeta', width: 90 },
      { header: 'Kod programa', width: 70 },
      { header: 'Kod projekta', width: 70 },
      { header: 'Ekon. klas.', width: 90 },
      { header: 'Izvor finans.', width: 70 },
      { header: 'Kod funkcije', width: 70 },
      { header: 'Iznos', width: 100 },
      { header: 'Račun evidentiranja', width: 100 },
      { header: 'Oček. datum plać.', width: 90 },
      { header: 'Hitno', width: 50 },
      { header: 'Račun knjiženja', width: 100 },
      { header: 'Razred', width: 80 },
    ];

    const esc = (s: string | number) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
 <Style ss:ID="Header">
  <Font ss:Bold="1" ss:Color="#FFFFFF"/>
  <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
 </Style>
 <Style ss:ID="Number">
  <NumberFormat ss:Format="#,##0.00"/>
 </Style>
</Styles>
<Worksheet ss:Name="Zapisi">
<Table>
${columns.map((c) => `<Column ss:Width="${c.width}"/>`).join('')}
<Row ss:StyleID="Header">${columns.map((c) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${esc(c.header)}</Data></Cell>`).join('')}</Row>
${sorted.map((r, i) => {
  const cells = [
    getDisplayNumber(r, i), r.reason_code, r.external_id, r.recipient, r.recipient_place,
    r.account_number, r.invoice_number, r.invoice_type,
    formatDate(r.invoice_date), formatDate(r.due_date),
    r.contract_number, r.payment_code, r.credit_model,
    r.credit_reference_number, r.payment_basis,
    r.item.budget_user_id, r.item.program_code, r.item.project_code,
    r.item.economic_classification_code, r.item.source_of_funding_code,
    r.item.function_code, r.item.amount, r.item.recording_account,
    formatDate(r.item.expected_payment_date),
    r.item.urgent_payment ? 'Da' : 'Ne',
    r.item.posting_account,
    r.class_group,
  ];
  return `<Row>${cells.map((val, ci) => {
    const isNum = (ci === 0 || ci === 21) && typeof val === 'number';
    const style = ci === 21 ? ' ss:StyleID="Number"' : '';
    return `<Cell${style}><Data ss:Type="${isNum ? 'Number' : 'String'}">${esc(val)}</Data></Cell>`;
  }).join('')}</Row>`;
}).join('')}
</Table>
</Worksheet>
<Worksheet ss:Name="Zaglavlje">
<Table>
<Row><Cell><Data ss:Type="String">Kumulativni kod razloga</Data></Cell><Cell><Data ss:Type="String">${esc(header.cumulative_reason_code)}</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">Budžetska godina</Data></Cell><Cell><Data ss:Type="String">${esc(header.budget_year)}</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">ID korisnika budžeta</Data></Cell><Cell><Data ss:Type="String">${esc(header.budget_user_id)}</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">Kod valute</Data></Cell><Cell><Data ss:Type="String">${esc(header.currency_code)}</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">Trezor</Data></Cell><Cell><Data ss:Type="String">${esc(header.treasury)}</Data></Cell></Row>
${authState.user ? `<Row><Cell><Data ss:Type="String">Korisnik</Data></Cell><Cell><Data ss:Type="String">${esc(authState.user.pdf_display_name || authState.user.username)}</Data></Cell></Row>` : ''}
<Row><Cell><Data ss:Type="String">Datum izvoza</Data></Cell><Cell><Data ss:Type="String">${esc(new Date().toLocaleDateString('sr-RS'))}</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">Ukupno zapisa</Data></Cell><Cell><Data ss:Type="Number">${sorted.length}</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">Ukupan iznos</Data></Cell><Cell><Data ss:Type="Number">${sorted.reduce((s, r) => s + r.item.amount, 0)}</Data></Cell></Row>
</Table>
</Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zapisi_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestartExternalIds = () => {
    setShowRestartConfirm(true);
  };

  const confirmRestartExternalIds = async () => {
    setShowRestartConfirm(false);
    setIsRestartingIds(true);
    setExternalIdMessage(null);

    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const monthYear = `${mm}/${yyyy}`;
      const sorted = sortRecordsBySequence(allRecordsRef.current);
      const updated = sorted.map((record, index) => ({
        ...record,
        external_id: `${String(index + 1).padStart(4, '0')}-${monthYear}`
      }));

      setAllRecords(updated);
      allRecordsRef.current = updated;
      setRecords(searchQuery ? filterRecords(updated, searchQuery) : updated);
      saveRecords(updated, dbUserId ?? undefined);

      if (dbUserId && isOnline) {
        suppressRealtimeUntil.current = Date.now() + 4000;
        const hid = await saveHeaderToDatabase(dbUserId, headerRef.current);
        await upsertRecordsBatch(dbUserId, hid, updated);
      }

      setExternalIdMessage({
        type: 'success',
        text: `Restartovano! Spoljašnji ID-evi postavljeni od 0001 do ${String(updated.length).padStart(4, '0')} za ${mm}/${yyyy}.`
      });
      setTimeout(() => setExternalIdMessage(null), 5000);
    } catch (error) {
      setExternalIdMessage({
        type: 'error',
        text: `Greška: ${error instanceof Error ? error.message : 'Nepoznata greška'}`
      });
      setTimeout(() => setExternalIdMessage(null), 5000);
    } finally {
      setIsRestartingIds(false);
    }
  };

  const handleValidateExternalIds = () => {
    setIsValidatingIds(true);
    setExternalIdMessage(null);

    try {
      const idCounts = new Map<string, number>();
      const emptyRows: number[] = [];

      allRecords.forEach((record, idx) => {
        const eid = (record.external_id || '').trim();
        if (!eid) {
          emptyRows.push(idx + 1);
          return;
        }
        idCounts.set(eid, (idCounts.get(eid) || 0) + 1);
      });

      const duplicateIds: string[] = [];
      idCounts.forEach((count, eid) => {
        if (count > 1) duplicateIds.push(eid);
      });

      if (duplicateIds.length === 0 && emptyRows.length === 0) {
        setExternalIdMessage({
          type: 'success',
          text: `Nema duplikata! Svih ${allRecords.length} spoljašnjih ID-eva su jedinstveni.`
        });
      } else {
        const msgs: string[] = [];
        if (duplicateIds.length > 0) {
          msgs.push(`Duplirani ID-evi (${duplicateIds.length}):\n  ${duplicateIds.join('\n  ')}`);
        }
        if (emptyRows.length > 0) {
          msgs.push(`Prazni spoljašnji ID-evi na redovima: ${emptyRows.join(', ')}`);
        }
        setExternalIdMessage({ type: 'error', text: msgs.join('\n\n') });
      }

      setTimeout(() => setExternalIdMessage(null), 8000);
    } finally {
      setIsValidatingIds(false);
    }
  };

  const totalPages = Math.ceil(records.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = records.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  useEffect(() => { setCurrentPage(1); }, [viewMode]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600"></div>
          <p className="text-sm text-gray-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    if (showAdminLogin) {
      return (
        <AdminLoginForm
          onLogin={handleAdminLogin}
          onBack={() => setShowAdminLogin(false)}
          error={authError}
        />
      );
    }
    return (
      <LoginForm
        onLogin={handleUserLogin}
        onAdminLogin={() => setShowAdminLogin(true)}
        error={authError}
      />
    );
  }

  if (authState.isAdmin) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  const openDrawer = (index: number) => {
    setDrawerRecord(records[index]);
    setDrawerIndex(index);
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setDrawerRecord(null);
    setDrawerIndex(-1);
  };

  const loadDemoData = () => {
    const { records: demoRecords, header: demoHeader } = generateDemoRecords(55);
    const sorted = sortRecordsBySequence(demoRecords);
    setAllRecords(sorted);
    setRecords(sorted);
    setHeader(demoHeader);
    setSearchQuery('');
    setCurrentPage(1);
    setErrors([]);
    addToast('success', 'Učitano 55 demo zapisa');
  };

  const filterChips: { label: string; onRemove: () => void }[] = [];
  if (advancedFilter.programCode) filterChips.push({ label: `Program: ${advancedFilter.programCode}`, onRemove: () => handleAdvancedFilterChange({ ...advancedFilter, programCode: '' }) });
  if (advancedFilter.economicCode) filterChips.push({ label: `Ekon. klas.: ${advancedFilter.economicCode}`, onRemove: () => handleAdvancedFilterChange({ ...advancedFilter, economicCode: '' }) });
  if (advancedFilter.urgentOnly) filterChips.push({ label: 'Hitno: Da', onRemove: () => handleAdvancedFilterChange({ ...advancedFilter, urgentOnly: false }) });
  if (advancedFilter.zeroAmountOnly) filterChips.push({ label: 'Iznos: 0', onRemove: () => handleAdvancedFilterChange({ ...advancedFilter, zeroAmountOnly: false }) });
  if (advancedFilter.amountMin) filterChips.push({ label: `Min: ${advancedFilter.amountMin}`, onRemove: () => handleAdvancedFilterChange({ ...advancedFilter, amountMin: '' }) });
  if (advancedFilter.amountMax) filterChips.push({ label: `Max: ${advancedFilter.amountMax}`, onRemove: () => handleAdvancedFilterChange({ ...advancedFilter, amountMax: '' }) });

  return (
    <AppShell
      authState={authState}
      isOnline={isOnline}
      isSyncing={isSyncing}
      syncMessage={syncMessage}
      onLogout={handleLogout}
    >
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight text-gray-900">Izvoz XML zapisa</h1>
        <p className="mt-1 text-sm text-gray-500">Kreiranje i upravljanje zapisima obaveza za XML izvoz</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span className="font-medium text-gray-500">{header.cumulative_reason_code || '—'}</span>
          <span>·</span>
          <span className="font-medium text-gray-500">{header.budget_year || '—'}</span>
          <span>·</span>
          <span className="font-medium text-gray-500">Korisnik {header.budget_user_id || '—'}</span>
          <span>·</span>
          <span className="font-medium text-gray-500">{header.currency_code || '—'}</span>
          <span>·</span>
          <span className="font-medium text-gray-500">Trezor {header.treasury || '—'}</span>
        </div>
      </div>

      <ContextCard header={header} onChange={setHeader} errors={errors} />

      {externalIdMessage && (
        <div className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${
          externalIdMessage.type === 'success' ? 'border-success-200/60 bg-success-50' : 'border-error-200/60 bg-error-50'
        }`}>
          {externalIdMessage.type === 'success'
            ? <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />
            : <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-600" />
          }
          <p className={`whitespace-pre-line text-sm font-medium ${
            externalIdMessage.type === 'success' ? 'text-success-600' : 'text-error-600'
          }`}>{externalIdMessage.text}</p>
        </div>
      )}

      {authState.user && allRecords.length > 0 && (
        <SequenceIntegrityMonitor
          userId={authState.user.id}
          onRepairComplete={async () => {
            if (!dbUserId) return;
            suppressSyncCount.current = 2;
            suppressRealtimeUntil.current = Date.now() + 5000;
            const fresh = await getRecordsFromDatabase(dbUserId);
            const sorted = sortRecordsBySequence(fresh);
            allRecordsRef.current = sorted;
            setAllRecords(sorted);
            setRecords(sorted);
            saveRecords(sorted, dbUserId);
          }}
        />
      )}

      <ValidationStatus errors={errors} />

      {allRecords.length > 0 && (
        <SummaryMetrics allRecords={allRecords} filteredCount={records.length} />
      )}

      <ActionToolbar
        onAdd={() => addRecords(1)}
        onImport={() => setShowImportDialog(true)}
        onExportXML={handleExport}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onToggleView={() => setViewMode(viewMode === 'table' ? 'forms' : 'table')}
        onBulkEdit={() => setShowBulkEditModal(true)}
        onRestartIds={handleRestartExternalIds}
        onValidateIds={handleValidateExternalIds}
        onHistory={() => setShowHistory(true)}
        onDeleteAll={() => setShowDeleteConfirm(true)}
        hasRecords={allRecords.length > 0}
        viewMode={viewMode}
        isRestartingIds={isRestartingIds}
        isValidatingIds={isValidatingIds}
        hasDbUserId={!!dbUserId}
      />

      {allRecords.length > 0 && (
        <>
          <SearchBar
            onSearch={handleSearch}
            placeholder="Pretraži zapise..."
            activeFilterChips={filterChips}
          />
          <AdvancedFilterPanel
            filter={advancedFilter}
            onChange={handleAdvancedFilterChange}
            onClear={() => handleAdvancedFilterChange(emptyFilter())}
            resultCount={records.length}
            totalCount={allRecords.length}
          />
        </>
      )}

      <div className="mb-6">
        {viewMode === 'table' ? (
          <RecordsTable
            records={currentRecords}
            onEdit={handleEditRecord}
            onRemove={removeRecord}
            onView={openDrawer}
            onClone={handleCloneRecord}
            errors={errors}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isSearching={searchQuery.trim() !== '' || isFilterActive(advancedFilter)}
            searchQuery={searchQuery}
            totalCount={records.length}
            currencyCode={header.currency_code}
            onAddRecord={() => addRecords(1)}
            onLoadDemo={loadDemoData}
          />
        ) : (
          <div className="space-y-4">
            {currentRecords.length === 0 ? (
              <div className="card p-12 text-center">
                {searchQuery.trim() !== '' ? (
                  <>
                    <p className="text-gray-500">Nema rezultata za: <strong className="text-gray-700">"{searchQuery}"</strong></p>
                    <p className="mt-1 text-sm text-gray-400">Pokušajte sa drugim pojmom</p>
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-gray-500">Još nema zapisa.</p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => addRecords(1)} className="btn-primary mx-auto">
                        <Plus className="h-4 w-4" /> Dodaj prvi zapis
                      </button>
                      <button onClick={loadDemoData} className="btn-secondary mx-auto">
                        Učitaj demo podatke
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {currentRecords.map((record, localIndex) => {
                  const globalIndex = startIndex + localIndex;
                  return (
                    <RecordForm
                      key={record.id}
                      record={record}
                      index={globalIndex}
                      onChange={(updated) => updateRecord(globalIndex, updated)}
                      onRemove={() => removeRecord(globalIndex)}
                      errors={errors}
                    />
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      <RecordDetailDrawer
        record={drawerRecord}
        isOpen={showDrawer}
        onClose={closeDrawer}
        onEdit={() => {
          if (drawerIndex >= 0) {
            closeDrawer();
            handleEditRecord(drawerIndex);
          }
        }}
        onDuplicate={() => {
          if (drawerIndex >= 0) {
            handleCloneRecord(drawerIndex);
            closeDrawer();
            addToast('success', 'Zapis dupliran');
          }
        }}
        onDelete={() => {
          if (drawerIndex >= 0) {
            removeRecord(drawerIndex);
            closeDrawer();
          }
        }}
      />

      {showModal && editingRecord && (
        <RecordModal
          record={editingRecord}
          index={selectedRecordIndex}
          isOpen={showModal}
          mode={modalMode}
          onClose={handleCloseModal}
          onChange={setEditingRecord}
          onSave={handleSaveRecord}
          errors={errors}
        />
      )}

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportXML={(file) => {
          setShowImportDialog(false);
          handleImportXML({ target: { files: [file], value: '' } } as any);
        }}
        onImportExcel={(file) => {
          setShowImportDialog(false);
          handleImportExcel({ target: { files: [file], value: '' } } as any);
        }}
        isImporting={isImporting}
      />

      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        onApply={handleBulkEdit}
        recordCount={records.length}
      />

      <RestartConfirmModal
        isOpen={showRestartConfirm}
        recordCount={allRecords.length}
        onConfirm={confirmRestartExternalIds}
        onCancel={() => setShowRestartConfirm(false)}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        recordCount={allRecords.length}
        onConfirm={clearAll}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {dbUserId && (
        <HistoryModal
          isOpen={showHistory}
          userId={dbUserId}
          onClose={() => setShowHistory(false)}
          onRestore={(restoredRecords, restoredHeader) => {
            const sorted = sortRecordsBySequence(restoredRecords);
            setAllRecords(sorted);
            setRecords(sorted);
            setHeader(restoredHeader);
            setSearchQuery('');
            setCurrentPage(1);
            saveRecords(sorted, dbUserId ?? undefined);
            saveHeader(restoredHeader, dbUserId ?? undefined);
            if (dbUserId && isOnline) {
              saveHeaderToDatabase(dbUserId, restoredHeader)
                .then(hid => upsertRecordsBatch(dbUserId, hid, sorted))
                .catch(console.error);
            }
          }}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />

      {authState.user && (
        <div className="mt-12 text-center text-xs text-gray-400">
          <p>Podaci se automatski čuvaju i sinhronizuju na svim uređajima.</p>
        </div>
      )}
    </AppShell>
  );
}

export default App;