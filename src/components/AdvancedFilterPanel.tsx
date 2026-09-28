import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterCriteria {
  dateFrom: string;
  dateTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  amountMin: string;
  amountMax: string;
  programCode: string;
  economicCode: string;
  urgentOnly: boolean;
  zeroAmountOnly: boolean;
}

export const emptyFilter = (): FilterCriteria => ({
  dateFrom: '', dateTo: '', dueDateFrom: '', dueDateTo: '',
  amountMin: '', amountMax: '', programCode: '', economicCode: '',
  urgentOnly: false, zeroAmountOnly: false,
});

export const isFilterActive = (f: FilterCriteria): boolean =>
  !!(f.dateFrom || f.dateTo || f.dueDateFrom || f.dueDateTo || f.amountMin || f.amountMax || f.programCode || f.economicCode || f.urgentOnly || f.zeroAmountOnly);

interface Props {
  filter: FilterCriteria;
  onChange: (f: FilterCriteria) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

export const AdvancedFilterPanel: React.FC<Props> = ({ filter, onChange, onClear, resultCount, totalCount }) => {
  const [open, setOpen] = useState(false);
  const active = isFilterActive(filter);

  const set = (key: keyof FilterCriteria, value: string | boolean) =>
    onChange({ ...filter, [key]: value });

  return (
    <div className="card mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span>Napredno filtriranje</span>
          {active && (
            <span className="ml-1 inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
              {resultCount} od {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-200"
            >
              <X className="h-3 w-3" />
              Očisti
            </button>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 animate-fade-in">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="input-label">Datum fakture od</label>
              <input type="date" value={filter.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="input-label">Datum fakture do</label>
              <input type="date" value={filter.dateTo} onChange={e => set('dateTo', e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="input-label">Datum dospeća od</label>
              <input type="date" value={filter.dueDateFrom} onChange={e => set('dueDateFrom', e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="input-label">Datum dospeća do</label>
              <input type="date" value={filter.dueDateTo} onChange={e => set('dueDateTo', e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="input-label">Iznos od (RSD)</label>
              <input type="number" min="0" value={filter.amountMin} onChange={e => set('amountMin', e.target.value)} placeholder="0" className="input-base" />
            </div>
            <div>
              <label className="input-label">Iznos do (RSD)</label>
              <input type="number" min="0" value={filter.amountMax} onChange={e => set('amountMax', e.target.value)} placeholder="∞" className="input-base" />
            </div>
            <div>
              <label className="input-label">Kod programa</label>
              <input type="text" value={filter.programCode} onChange={e => set('programCode', e.target.value)} placeholder="npr. 2003" className="input-base" />
            </div>
            <div>
              <label className="input-label">Ekonomska klasifikacija</label>
              <input type="text" value={filter.economicCode} onChange={e => set('economicCode', e.target.value)} placeholder="npr. 472717" className="input-base" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={filter.urgentOnly} onChange={e => set('urgentOnly', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm text-gray-700">Samo hitna plaćanja</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={filter.zeroAmountOnly} onChange={e => set('zeroAmountOnly', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-warning-600 focus:ring-warning-600" />
              <span className="text-sm text-gray-700">Samo nulti iznosi</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
