import React, { useState, useRef } from 'react';
import { Plus, Upload, Download, MoreHorizontal, ChevronDown, FileText, Table, CreditCard as Edit, RefreshCw, CheckCircle, History, Trash2, FileSpreadsheet } from 'lucide-react';

interface ActionToolbarProps {
  onAdd: () => void;
  onImport: () => void;
  onExportXML: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onToggleView: () => void;
  onBulkEdit: () => void;
  onRestartIds: () => void;
  onValidateIds: () => void;
  onHistory: () => void;
  onDeleteAll: () => void;
  hasRecords: boolean;
  viewMode: 'table' | 'forms';
  isRestartingIds: boolean;
  isValidatingIds: boolean;
  hasDbUserId: boolean;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onAdd, onImport, onExportXML, onExportCSV, onExportExcel, onExportPDF, onToggleView, onBulkEdit,
  onRestartIds, onValidateIds, onHistory, onDeleteAll, hasRecords, viewMode, isRestartingIds, isValidatingIds, hasDbUserId,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [morePos, setMorePos] = useState({ top: 0, right: 0 });

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openMore = () => {
    const rect = moreRef.current?.getBoundingClientRect();
    if (rect) setMorePos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setMoreOpen(o => !o);
  };

  const exportItems = [
    { label: 'XML', icon: <Download className="h-4 w-4" />, onClick: onExportXML },
    { label: 'CSV', icon: <FileSpreadsheet className="h-4 w-4" />, onClick: onExportCSV },
    { label: 'Excel', icon: <FileSpreadsheet className="h-4 w-4" />, onClick: onExportExcel },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5">
      {/* Primary action */}
      <button onClick={onAdd} className="btn-primary">
        <Plus className="h-4 w-4" />
        Dodaj zapis
      </button>

      {/* Import */}
      <button onClick={onImport} className="btn-secondary">
        <Upload className="h-4 w-4" />
        Import
      </button>

      {/* Export dropdown */}
      {hasRecords && (
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(o => !o)}
            className="btn-secondary"
          >
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-dropdown animate-fade-in">
                {exportItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setExportOpen(false); item.onClick(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* More actions */}
      {hasRecords && (
        <div className="relative" ref={moreRef}>
          <button onClick={openMore} className="btn-secondary px-3">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div
                role="menu"
                style={{ top: morePos.top, right: morePos.right }}
                className="fixed z-50 w-60 rounded-xl border border-gray-200 bg-white p-1.5 shadow-dropdown animate-fade-in"
              >
                <button onClick={() => { setMoreOpen(false); onExportPDF(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                  <FileText className="h-4 w-4 text-gray-500" /> PDF pregled
                </button>
                <button onClick={() => { setMoreOpen(false); onToggleView(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                  <Table className="h-4 w-4 text-gray-500" /> {viewMode === 'table' ? 'Pregled formi' : 'Pregled tabele'}
                </button>
                <button onClick={() => { setMoreOpen(false); onBulkEdit(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                  <Edit className="h-4 w-4 text-gray-500" /> Grupno menjanje
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => { setMoreOpen(false); onRestartIds(); }} disabled={isRestartingIds} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 text-gray-500 ${isRestartingIds ? 'animate-spin' : ''}`} /> {isRestartingIds ? 'Restartovanje...' : 'Restartuj ID-eve'}
                </button>
                <button onClick={() => { setMoreOpen(false); onValidateIds(); }} disabled={isValidatingIds} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
                  <CheckCircle className="h-4 w-4 text-gray-500" /> {isValidatingIds ? 'Provera...' : 'Proveri ID-eve'}
                </button>
                {hasDbUserId && (
                  <button onClick={() => { setMoreOpen(false); onHistory(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                    <History className="h-4 w-4 text-gray-500" /> Istorija verzija
                  </button>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => { setMoreOpen(false); onDeleteAll(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50">
                  <Trash2 className="h-4 w-4" /> Obriši sve
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
