import React, { useState } from 'react';
import { X } from 'lucide-react';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (updates: BulkEditData) => void;
  recordCount: number;
}

export interface BulkEditData {
  invoice_number?: string;
  invoice_type?: string;
  invoice_date?: string;
  due_date?: string;
  expected_payment_date?: string;
  contract_number?: string;
  payment_basis?: string;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, onApply, recordCount }) => {
  const [updates, setUpdates] = useState<BulkEditData>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value && value.trim() !== '') acc[key as keyof BulkEditData] = value;
      return acc;
    }, {} as BulkEditData);

    if (Object.keys(filtered).length === 0) {
      alert('Molimo unesite najmanje jedno polje za izmenu.');
      return;
    }
    onApply(filtered);
    onClose();
    setUpdates({});
  };

  const handleClose = () => { onClose(); setUpdates({}); };

  const fields: { key: keyof BulkEditData; label: string; type: string; placeholder?: string }[] = [
    { key: 'invoice_number', label: 'Broj fakture', type: 'text', placeholder: 'Novi broj fakture za sve zapise' },
    { key: 'invoice_type', label: 'Tip fakture', type: 'text', placeholder: 'Tip fakture za sve zapise' },
    { key: 'invoice_date', label: 'Datum fakture', type: 'date' },
    { key: 'due_date', label: 'Datum dospeća', type: 'date' },
    { key: 'expected_payment_date', label: 'Očekivani datum plaćanja', type: 'date' },
    { key: 'contract_number', label: 'Broj ugovora', type: 'text', placeholder: 'Broj ugovora za sve zapise' },
    { key: 'payment_basis', label: 'Osnov plaćanja', type: 'text', placeholder: 'Osnov plaćanja za sve zapise' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-navy-900/40 animate-fade-in" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-dropdown animate-fade-in">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Grupno menjanje podataka</h2>
          <button onClick={handleClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="mb-5 rounded-lg border border-brand-200/60 bg-brand-50 px-4 py-3">
            <p className="text-sm text-brand-700">
              Ove izmene će biti primenjene na svih <strong>{recordCount}</strong> zapisa. Ostavite polja prazna ako ne želite da ih menjate.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="input-label">{f.label}</label>
                <input
                  type={f.type}
                  value={(updates as any)[f.key] || ''}
                  onChange={(e) => setUpdates({ ...updates, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="input-base"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={handleClose} className="btn-secondary">Otkaži</button>
            <button type="submit" className="btn-primary">Primeni izmene</button>
          </div>
        </form>
      </div>
    </>
  );
};
