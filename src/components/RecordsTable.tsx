import React from 'react';
import { Record, ValidationError } from '../types/records';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal, Eye, Pencil, Copy, Trash2, FileText, Plus } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

type SortField = 'sequence_number' | 'recipient' | 'amount' | 'invoice_date' | 'due_date' | 'reason_code' | 'external_id' | 'class_group';
type SortDir = 'asc' | 'desc';

interface RecordsTableProps {
  records: Record[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onView: (index: number) => void;
  onClone?: (index: number) => void;
  errors: ValidationError[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isSearching?: boolean;
  searchQuery?: string;
  totalCount?: number;
  currencyCode?: string;
  onAddRecord?: () => void;
  onLoadDemo?: () => void;
}

const formatAmount = (amount: number) => amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records, onEdit, onRemove, onView, onClone, errors, currentPage, totalPages, onPageChange, isSearching, searchQuery, totalCount, currencyCode = 'RSD', onAddRecord, onLoadDemo,
}) => {
  const [sortField, setSortField] = React.useState<SortField | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [rowMenu, setRowMenu] = React.useState<number | null>(null);
  const rowMenuRef = React.useRef<HTMLDivElement>(null);
  const [rowMenuPos, setRowMenuPos] = React.useState({ top: 0, right: 0 });

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) setRowMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortedRecords = React.useMemo(() => {
    if (!sortField) return records;
    return [...records].sort((a, b) => {
      let aVal: string | number = 0, bVal: string | number = 0;
      if (sortField === 'amount') { aVal = a.item.amount; bVal = b.item.amount; }
      else if (sortField === 'sequence_number') { aVal = a.sequence_number ?? 0; bVal = b.sequence_number ?? 0; }
      else if (sortField === 'recipient') { aVal = a.recipient.toLowerCase(); bVal = b.recipient.toLowerCase(); }
      else if (sortField === 'invoice_date') { aVal = a.invoice_date; bVal = b.invoice_date; }
      else if (sortField === 'due_date') { aVal = a.due_date; bVal = b.due_date; }
      else if (sortField === 'reason_code') { aVal = a.reason_code.toLowerCase(); bVal = b.reason_code.toLowerCase(); }
      else if (sortField === 'external_id') { aVal = a.external_id.toLowerCase(); bVal = b.external_id.toLowerCase(); }
      else if (sortField === 'class_group') { aVal = a.class_group.toLowerCase(); bVal = b.class_group.toLowerCase(); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortDir]);

  const getGlobalIndex = (localIndex: number) => (currentPage - 1) * 20 + localIndex;
  const getDisplayNumber = (record: Record, fallbackIndex: number) => record.sequence_number ?? fallbackIndex + 1;
  const hasError = (recordIndex: number) => errors.some(e => e.field.startsWith(`record_${recordIndex}`));

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="ml-1 inline h-3 w-3 text-brand-600" /> : <ArrowDown className="ml-1 inline h-3 w-3 text-brand-600" />;
  };

  const SortableTh = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition hover:text-gray-600 ${className}`}
      onClick={() => handleSort(field)}
    >
      {label}<SortIcon field={field} />
    </th>
  );

  const openRowMenu = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setRowMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setRowMenu(index === rowMenu ? null : index);
  };

  if (records.length === 0) {
    return (
      <div className="card p-12 text-center">
        {isSearching ? (
          <>
            <p className="text-gray-500">Nema rezultata za: <strong className="text-gray-700">"{searchQuery}"</strong></p>
            <p className="mt-1 text-sm text-gray-400">Pokušajte sa drugim pojmom pretrage</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Nema zapisa</p>
              <p className="mt-1 text-sm text-gray-500">Dodajte prvi zapis ili učitajte demo podatke.</p>
            </div>
            <div className="flex gap-3">
              {onAddRecord && (
                <button onClick={onAddRecord} className="btn-primary">
                  <Plus className="h-4 w-4" /> Dodaj zapis
                </button>
              )}
              {onLoadDemo && (
                <button onClick={onLoadDemo} className="btn-secondary">
                  Učitaj demo podatke
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur">
            <tr className="border-b border-gray-100">
              <SortableTh field="sequence_number" label="#" />
              <SortableTh field="recipient" label="Primalac" />
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Broj računa</th>
              <SortableTh field="amount" label="Iznos" className="text-right" />
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Program</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ekon. klas.</th>
              <SortableTh field="class_group" label="Razred" />
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="sticky right-0 bg-gray-50/80 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Akcije</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedRecords.map((record, index) => {
              const globalIndex = getGlobalIndex(index);
              const error = hasError(globalIndex);
              return (
                <tr
                  key={record.id}
                  onClick={() => onView(globalIndex)}
                  className={`cursor-pointer transition hover:bg-gray-50/80 ${error ? 'bg-red-50/40' : ''}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-400">
                    {getDisplayNumber(record, globalIndex)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">{record.recipient || '—'}</span>
                      <span className="text-xs text-gray-400">{record.external_id || 'auto'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{record.account_number || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {formatAmount(record.item.amount)} <span className="text-xs font-normal text-gray-400">{currencyCode}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{record.item.program_code || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{record.item.economic_classification_code || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {record.class_group || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {error ? <StatusBadge type="error" /> : record.item.amount === 0 ? <StatusBadge type="warning" /> : <StatusBadge type="valid" />}
                  </td>
                  <td className="sticky right-0 bg-white px-4 py-3 text-right group-hover:bg-gray-50/80" onClick={e => e.stopPropagation()}>
                    <div className="relative inline-block" ref={rowMenu === index ? rowMenuRef : undefined}>
                      <button
                        onClick={(e) => openRowMenu(e, index)}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Akcije"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {rowMenu === index && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
                          <div
                            style={{ top: rowMenuPos.top, right: rowMenuPos.right }}
                            className="fixed z-50 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-dropdown animate-fade-in"
                          >
                            <button onClick={() => { setRowMenu(null); onView(globalIndex); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                              <Eye className="h-4 w-4 text-gray-500" /> Pregled
                            </button>
                            <button onClick={() => { setRowMenu(null); onEdit(globalIndex); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                              <Pencil className="h-4 w-4 text-gray-500" /> Izmeni
                            </button>
                            {onClone && (
                              <button onClick={() => { setRowMenu(null); onClone(globalIndex); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                                <Copy className="h-4 w-4 text-gray-500" /> Dupliraj
                              </button>
                            )}
                            <div className="my-1 border-t border-gray-100" />
                            <button onClick={() => { setRowMenu(null); onRemove(globalIndex); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50">
                              <Trash2 className="h-4 w-4" /> Obriši
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-gray-50 md:hidden">
        {sortedRecords.map((record, index) => {
          const globalIndex = getGlobalIndex(index);
          const error = hasError(globalIndex);
          return (
            <div
              key={record.id}
              onClick={() => onView(globalIndex)}
              className="cursor-pointer p-4 transition hover:bg-gray-50/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">#{getDisplayNumber(record, globalIndex)}</span>
                    {record.class_group && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">{record.class_group}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{record.recipient || '—'}</p>
                  <p className="text-xs text-gray-400">{record.external_id || 'auto'}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>{record.item.program_code || '—'}</span>
                    <span>·</span>
                    <span>{record.account_number || '—'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-gray-900">{formatAmount(record.item.amount)}</span>
                  <span className="text-xs text-gray-400">{currencyCode}</span>
                  {error ? <StatusBadge type="error" /> : record.item.amount === 0 ? <StatusBadge type="warning" /> : <StatusBadge type="valid" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row">
        <p className="text-xs text-gray-500">
          {totalCount !== undefined
            ? `${(currentPage - 1) * 20 + 1}–${Math.min(currentPage * 20, totalCount)} od ${totalCount} zapisa`
            : `${records.length} zapisa`}
          {' · '}
          {formatAmount(records.reduce((s, r) => s + r.item.amount, 0))} {currencyCode}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                    currentPage === pageNum
                      ? 'bg-brand-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
