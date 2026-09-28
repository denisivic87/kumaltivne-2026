import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, Trash2, Upload, Clock, FileText, AlertTriangle } from 'lucide-react';
import { getSnapshots, getSnapshotById, deleteSnapshot, Snapshot } from '../lib/database';
import { Header, Record } from '../types/records';

interface HistoryModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onRestore: (records: Record[], header: Header) => void;
}

const triggerLabel: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  import: {
    label: 'Import XML',
    icon: <Upload className="h-3.5 w-3.5" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  manual: {
    label: 'Ručno',
    icon: <FileText className="h-3.5 w-3.5" />,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  auto: {
    label: 'Automatski',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'bg-gray-100 text-gray-600 border-gray-200'
  }
};

export function HistoryModal({ isOpen, userId, onClose, onRestore }: HistoryModalProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSnapshots(userId);
      setSnapshots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju istorije');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(snapshot: Snapshot) {
    setConfirmRestore(null);
    setRestoring(snapshot.id);
    setError(null);
    try {
      const full = await getSnapshotById(snapshot.id);
      if (!full) throw new Error('Snapshot nije pronađen');
      onRestore(full.records_json, full.header_json);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri vraćanju podataka');
    } finally {
      setRestoring(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteSnapshot(id);
      setSnapshots(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri brisanju');
    } finally {
      setDeleting(null);
    }
  }

  if (!isOpen) return null;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('sr-RS', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Istorija verzija</h2>
              <p className="text-xs text-gray-500">Pregledajte i vratite prethodna stanja podataka</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mr-3" />
              <span>Učitavanje istorije...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-16">
              <History className="h-14 w-14 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-1">Nema sačuvanih verzija</p>
              <p className="text-sm text-gray-400">Verzije se automatski čuvaju pri importu XML fajla.<br />Možete i ručno sačuvati trenutno stanje.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-3">Prikazano {snapshots.length} od max. 50 verzija</p>
              {snapshots.map((snap, idx) => {
                const trig = triggerLabel[snap.trigger] || triggerLabel.manual;
                const isFirst = idx === 0;
                return (
                  <div
                    key={snap.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      isFirst ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${trig.color}`}>
                        {trig.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{snap.label}</p>
                          {isFirst && (
                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium flex-shrink-0">Najnovije</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-xs text-gray-500">{fmt(snap.created_at)}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">{snap.record_count} zapisa</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                      <button
                        onClick={() => setConfirmRestore(snap)}
                        disabled={restoring === snap.id}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className={`h-3.5 w-3.5 ${restoring === snap.id ? 'animate-spin' : ''}`} />
                        <span>{restoring === snap.id ? 'Vraćam...' : 'Vrati'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(snap.id)}
                        disabled={deleting === snap.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Obriši ovu verziju"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">Verzije se čuvaju automatski pri importu i ručno.</p>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            Zatvori
          </button>
        </div>
      </div>

      {/* Confirm restore dialog */}
      {confirmRestore && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Vraćanje podataka</h3>
                <p className="text-xs text-gray-500">Ova akcija zamenjuje trenutne podatke</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Biće učitano <strong>{confirmRestore.record_count} zapisa</strong> iz verzije:
            </p>
            <p className="text-sm font-medium text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-5">
              {confirmRestore.label}
            </p>
            <p className="text-xs text-red-600 mb-5">Trenutni podaci će biti zamenjeni. Ova akcija se ne može poništiti.</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmRestore(null)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                Otkaži
              </button>
              <button onClick={() => handleRestore(confirmRestore)} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                Da, vrati
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
