import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Record } from '../types/records';

interface RecordDetailDrawerProps {
  record: Record | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const formatDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('sr-RS'); } catch { return d; }
};

const formatAmount = (n: number) => n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const RecordDetailDrawer: React.FC<RecordDetailDrawerProps> = ({
  record, isOpen, onClose, onEdit, onDuplicate, onDelete,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const sections = [
    {
      title: 'OSNOVNI PODACI',
      fields: [
        { label: 'Primalac', value: record.recipient || '—' },
        { label: 'Spoljašnji ID', value: record.external_id || 'auto' },
        { label: 'Mesto primaoca', value: record.recipient_place || '—' },
        { label: 'Broj računa', value: record.account_number || '—' },
        { label: 'Kod razloga', value: record.reason_code || '—' },
      ],
    },
    {
      title: 'FAKTURA',
      fields: [
        { label: 'Broj fakture', value: record.invoice_number || '—' },
        { label: 'Tip fakture', value: record.invoice_type || '—' },
        { label: 'Datum fakture', value: formatDate(record.invoice_date) },
        { label: 'Datum dospeća', value: formatDate(record.due_date) },
        { label: 'Broj ugovora', value: record.contract_number || '—' },
        { label: 'Osnov plaćanja', value: record.payment_basis || '—' },
      ],
    },
    {
      title: 'BUDŽET',
      fields: [
        { label: 'ID korisnika budžeta', value: record.item.budget_user_id || '—' },
        { label: 'Kod programa', value: record.item.program_code || '—' },
        { label: 'Kod projekta', value: record.item.project_code || '—' },
        { label: 'Ekonomska klasifikacija', value: record.item.economic_classification_code || '—' },
        { label: 'Izvor finansiranja', value: record.item.source_of_funding_code || '—' },
        { label: 'Kod funkcije', value: record.item.function_code || '—' },
        { label: 'Račun evidentiranja', value: record.item.recording_account || '—' },
        { label: 'Račun knjiženja', value: record.item.posting_account || '—' },
      ],
    },
    {
      title: 'DODATNE INFORMACIJE',
      fields: [
        { label: 'Iznos', value: `${formatAmount(record.item.amount)} RSD` },
        { label: 'Očekivani datum plaćanja', value: formatDate(record.item.expected_payment_date) },
        { label: 'Razred', value: record.class_group || '—' },
        { label: 'Kod plaćanja', value: record.payment_code || '—' },
        { label: 'Model kredita', value: record.credit_model || '—' },
        { label: 'Ref. broj kredita', value: record.credit_reference_number || '—' },
        { label: 'Beleške', value: record.notes || '—' },
      ],
    },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-navy-900/40 animate-fade-in"
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-drawer animate-slide-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Zapis #{record.sequence_number ?? '—'}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-gray-900">{record.recipient || 'Bez primaoca'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status + amount */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
          {record.class_group && (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{record.class_group}</span>
          )}
          <span className="text-lg font-bold text-gray-900">{formatAmount(record.item.amount)} RSD</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{section.title}</h3>
                <dl className="space-y-2.5">
                  {section.fields.map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-4">
                      <dt className="text-sm text-gray-500">{f.label}</dt>
                      <dd className="text-right text-sm font-medium text-gray-900">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky actions */}
        <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-4">
          <button onClick={onEdit} className="btn-primary flex-1">
            <Pencil className="h-4 w-4" />
            Izmeni
          </button>
          <button onClick={onDuplicate} className="btn-secondary">
            <Copy className="h-4 w-4" />
            Dupliraj
          </button>
          <div className="relative">
            <button onClick={() => setMoreOpen(o => !o)} className="btn-secondary px-3" aria-label="Više opcija">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute bottom-full right-0 mb-1 z-50 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-dropdown animate-fade-in">
                  <button onClick={() => { setMoreOpen(false); onDelete(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Obriši
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
