import React from 'react';
import { Record, ValidationError } from '../types/records';
import { X } from 'lucide-react';

interface RecordModalProps {
  record: Record;
  index: number;
  isOpen: boolean;
  mode: 'view' | 'edit';
  onClose: () => void;
  onChange?: (record: Record) => void;
  onSave?: () => void;
  errors: ValidationError[];
}

export const RecordModal: React.FC<RecordModalProps> = ({
  record, index, isOpen, mode, onClose, onChange, onSave, errors,
}) => {
  if (!isOpen) return null;

  const getError = (field: string) => errors.find(e => e.field === field)?.message;
  const prefix = `record_${index}`;

  const handleRecordChange = (field: keyof Omit<Record, 'id' | 'item'>, value: string) => {
    if (onChange) onChange({ ...record, [field]: value });
  };

  const handleItemChange = (field: keyof Record['item'], value: string | number | boolean) => {
    if (onChange) onChange({ ...record, item: { ...record.item, [field]: value } });
  };

  const isReadOnly = mode === 'view';

  const inputClass = (errorField?: string) =>
    `input-base ${isReadOnly ? 'bg-gray-50' : ''} ${errorField && getError(`${prefix}_${errorField}`) ? 'border-red-400' : ''}`;

  const sections = [
    {
      title: 'OSNOVNI PODACI',
      fields: [
        { label: 'Kod razloga *', field: 'reason_code', type: 'text', errorKey: 'reason_code' },
        { label: 'Spoljašnji ID', field: 'external_id', type: 'text' },
        { label: 'Primalac *', field: 'recipient', type: 'text', errorKey: 'recipient' },
        { label: 'Mesto primaoca *', field: 'recipient_place', type: 'text', errorKey: 'recipient_place' },
        { label: 'Broj računa *', field: 'account_number', type: 'text', errorKey: 'account_number' },
        { label: 'Broj fakture', field: 'invoice_number', type: 'text' },
        { label: 'Tip fakture', field: 'invoice_type', type: 'text' },
        { label: 'Datum fakture *', field: 'invoice_date', type: 'date', errorKey: 'invoice_date' },
        { label: 'Datum dospeća *', field: 'due_date', type: 'date', errorKey: 'due_date' },
        { label: 'Broj ugovora', field: 'contract_number', type: 'text' },
        { label: 'Kod plaćanja', field: 'payment_code', type: 'text' },
        { label: 'Model kredita', field: 'credit_model', type: 'text' },
        { label: 'Ref. broj kredita', field: 'credit_reference_number', type: 'text' },
      ],
    },
    {
      title: 'BUDŽET',
      fields: [
        { label: 'ID korisnika budžeta *', field: 'item.budget_user_id', type: 'text', errorKey: 'item_budget_user_id' },
        { label: 'Kod programa *', field: 'item.program_code', type: 'text', errorKey: 'item_program_code' },
        { label: 'Kod projekta', field: 'item.project_code', type: 'text' },
        { label: 'Ekonomska klasifikacija *', field: 'item.economic_classification_code', type: 'text', errorKey: 'item_economic_classification_code' },
        { label: 'Izvor finansiranja *', field: 'item.source_of_funding_code', type: 'text', errorKey: 'item_source_of_funding_code' },
        { label: 'Kod funkcije *', field: 'item.function_code', type: 'text', errorKey: 'item_function_code' },
        { label: 'Iznos *', field: 'item.amount', type: 'number', errorKey: 'item_amount' },
        { label: 'Račun evidentiranja *', field: 'item.recording_account', type: 'text', errorKey: 'item_recording_account' },
        { label: 'Očekivani datum plaćanja *', field: 'item.expected_payment_date', type: 'date', errorKey: 'item_expected_payment_date' },
        { label: 'Račun knjiženja', field: 'item.posting_account', type: 'text' },
      ],
    },
  ];

  const renderField = (f: { label: string; field: string; type: string; errorKey?: string }) => {
    const isItem = f.field.startsWith('item.');
    const key = f.field.replace('item.', '') as any;
    const value = isItem ? (record.item as any)[key] : (record as any)[f.field];
    const handleChange = (v: string | number | boolean) => {
      if (isItem) handleItemChange(key, f.type === 'number' ? (typeof v === 'number' ? v : parseFloat(String(v)) || 0) : v);
      else handleRecordChange(f.field as any, v as string);
    };

    return (
      <div key={f.field}>
        <label className="input-label">{f.label}</label>
        <input
          type={f.type}
          step={f.type === 'number' ? '0.01' : undefined}
          min={f.type === 'number' ? '0' : undefined}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={isReadOnly}
          className={inputClass(f.errorKey)}
        />
        {f.errorKey && getError(`${prefix}_${f.errorKey}`) && (
          <p className="mt-1 text-xs text-red-500">{getError(`${prefix}_${f.errorKey}`)}</p>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-navy-900/40 animate-fade-in" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-dropdown animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Zapis #{index + 1}</p>
            <h2 className="mt-0.5 text-lg font-semibold text-gray-900">
              {mode === 'view' ? 'Pregled zapisa' : 'Uređivanje zapisa'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-5">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{section.title}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map(renderField)}
              </div>
            </div>
          ))}

          {/* Osnov plaćanja - full width */}
          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">DODATNE INFORMACIJE</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="input-label">Osnov plaćanja</label>
                <input
                  type="text"
                  value={record.payment_basis}
                  onChange={(e) => handleRecordChange('payment_basis', e.target.value)}
                  readOnly={isReadOnly}
                  className={inputClass()}
                />
              </div>
              <div>
                <label className="input-label">Razred (ne izvozi se u XML)</label>
                <input
                  type="text"
                  value={record.class_group}
                  onChange={(e) => handleRecordChange('class_group', e.target.value)}
                  readOnly={isReadOnly}
                  placeholder="npr. Razred 1, Grupa A..."
                  className={inputClass()}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="input-label">Beleške (ne izvozi se u XML)</label>
                <textarea
                  value={record.notes}
                  onChange={(e) => handleRecordChange('notes', e.target.value)}
                  readOnly={isReadOnly}
                  rows={2}
                  placeholder="Unesite beleške ili napomene..."
                  className={`input-base resize-none ${isReadOnly ? 'bg-gray-50' : ''}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button onClick={onClose} className="btn-secondary">
            {mode === 'view' ? 'Zatvori' : 'Otkaži'}
          </button>
          {mode === 'edit' && onSave && (
            <button onClick={onSave} className="btn-primary">
              Sačuvaj
            </button>
          )}
        </div>
      </div>
    </>
  );
};
