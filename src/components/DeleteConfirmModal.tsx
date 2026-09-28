import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  recordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, recordCount, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-navy-900/40 animate-fade-in" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white shadow-dropdown animate-fade-in">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50">
              <AlertTriangle className="h-5 w-5 text-error-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Obrisati sve zapise?</h2>
              <p className="mt-0.5 text-sm text-gray-500">Ova akcija se ne može poništiti.</p>
            </div>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">
            Biće obrisano <strong className="text-gray-900">{recordCount} {recordCount === 1 ? 'zapis' : 'zapisa'}</strong> iz ovog dokumenta i baze podataka.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={onCancel} className="btn-secondary">Otkaži</button>
            <button onClick={onConfirm} className="inline-flex h-10 items-center gap-2 rounded-lg bg-error-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]">
              <Trash2 className="h-4 w-4" />
              Obriši sve
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
