import React, { useState, useRef } from 'react';
import { X, Upload, FileText, FileSpreadsheet } from 'lucide-react';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportXML: (file: File) => void;
  onImportExcel: (file: File) => void;
  isImporting: boolean;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImportXML, onImportExcel, isImporting }) => {
  const [tab, setTab] = useState<'xml' | 'excel'>('xml');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const accept = tab === 'xml' ? '.xml' : '.xls,.xlsx,.xml';

  const handleFile = (file: File) => {
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleContinue = () => {
    if (!selectedFile) return;
    if (tab === 'xml') onImportXML(selectedFile);
    else onImportExcel(selectedFile);
    setSelectedFile(null);
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-navy-900/40 animate-fade-in" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white shadow-dropdown animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Import zapisa</h2>
          <button onClick={handleClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 px-5 pt-3">
          <button
            onClick={() => { setTab('xml'); setSelectedFile(null); }}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === 'xml' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4" /> XML
          </button>
          <button
            onClick={() => { setTab('excel'); setSelectedFile(null); }}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === 'excel' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition ${
                dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="mt-3 text-sm font-medium text-gray-600">
                Kliknite ili prevucite fajl ovde
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {tab === 'xml' ? 'Podržani format: .xml' : 'Podržani formati: .xls, .xlsx, .xml'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                  {tab === 'xml' ? <FileText className="h-5 w-5 text-brand-600" /> : <FileSpreadsheet className="h-5 w-5 text-success-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {isImporting && (
            <div className="mt-4 flex items-center gap-2 text-sm text-brand-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              Učitavanje...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button onClick={handleClose} className="btn-secondary">Otkaži</button>
          <button
            onClick={handleContinue}
            disabled={!selectedFile || isImporting}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nastavi
          </button>
        </div>
      </div>
    </>
  );
};
