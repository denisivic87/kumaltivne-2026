import React, { useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { Header, ValidationError } from '../types/records';

interface ContextCardProps {
  header: Header;
  onChange: (header: Header) => void;
  errors: ValidationError[];
}

const fields: { key: keyof Header; label: string; placeholder: string }[] = [
  { key: 'cumulative_reason_code', label: 'Kumulativni kod razloga', placeholder: 'PO07' },
  { key: 'budget_year', label: 'Budžetska godina', placeholder: '2026' },
  { key: 'budget_user_id', label: 'ID korisnika budžeta', placeholder: '01547' },
  { key: 'currency_code', label: 'Kod valute', placeholder: 'RSD' },
  { key: 'treasury', label: 'Trezor', placeholder: '601' },
];

export const ContextCard: React.FC<ContextCardProps> = ({ header, onChange, errors }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleChange = (key: keyof Header, value: string) => {
    onChange({ ...header, [key]: value });
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Kontekst dokumenta</h2>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">
            {header.cumulative_reason_code || '—'} · {header.budget_year || '—'} · {header.budget_user_id || '—'} · {header.currency_code || '—'} · {header.treasury || '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(e => !e)}
            className="btn-ghost text-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? 'Završi' : 'Uredi kontekst'}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="btn-ghost text-xs"
          >
            {expanded ? 'Sakrij detalje' : 'Prikaži detalje'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metadata row */}
      <div className="border-t border-gray-100 px-5 py-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {fields.map((f) => (
            <div key={f.key}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{f.label}</p>
              {editing ? (
                <>
                  <input
                    type="text"
                    value={header[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`input-base mt-1 h-8 text-[13px] ${getError(f.key) ? 'border-red-400' : ''}`}
                  />
                  {getError(f.key) && <p className="mt-0.5 text-xs text-red-500">{getError(f.key)}</p>}
                </>
              ) : (
                <p className="mt-1 text-[15px] font-semibold text-gray-900">{header[f.key] || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && editing && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 animate-fade-in">
          <p className="text-xs text-gray-500">Izmene se automatski čuvaju i sinhronizuju sa bazom.</p>
        </div>
      )}
    </div>
  );
};
