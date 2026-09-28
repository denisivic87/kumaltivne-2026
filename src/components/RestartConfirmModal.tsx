import { AlertTriangle, X } from 'lucide-react';

interface RestartConfirmModalProps {
  isOpen: boolean;
  recordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestartConfirmModal({ isOpen, recordCount, onConfirm, onCancel }: RestartConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-navy-900/40 animate-fade-in" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-dropdown animate-fade-in">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Restart spoljašnjih ID-eva</h2>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-lg border-l-4 border-warning-200 bg-warning-50 p-4">
            <p className="mb-2 text-sm font-medium text-gray-800">
              Ova akcija će prenumerisati sve spoljašnje ID-eve:
            </p>
            <div className="space-y-2 text-xs text-gray-600">
              <div>
                <span className="font-semibold">Trenutno (sa rupama):</span>
                <div className="mt-1 font-mono text-gray-500">1-03/2026, 3-03/2026, 5-03/2026, 382-03/2026, ...</div>
              </div>
              <div>
                <span className="font-semibold">Nakon restarta:</span>
                <div className="mt-1 font-mono text-success-600">1-03/2026, 2-03/2026, 3-03/2026, 4-03/2026, ...</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border-l-4 border-brand-200 bg-brand-50 p-4">
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-600">•</span>
                <span>Svi ID-evi će biti postavljeni <strong>sekvencijalno od 1 do {recordCount}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600">•</span>
                <span>Promene se primenjuju na <strong>SVE zapise u bazi</strong></span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border-l-4 border-error-200 bg-error-50 p-3">
            <p className="flex items-center gap-2 text-sm font-bold text-error-600">
              <AlertTriangle className="h-4 w-4" />
              Ovo se NE može poništiti!
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button onClick={onCancel} className="btn-secondary">Otkaži</button>
          <button onClick={onConfirm} className="btn-primary">Da, restartuj</button>
        </div>
      </div>
    </>
  );
}
