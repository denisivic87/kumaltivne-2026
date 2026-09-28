import React from 'react';
import { FileText, TrendingUp, AlertTriangle, CircleDollarSign } from 'lucide-react';
import { Record } from '../types/records';

interface SummaryMetricsProps {
  allRecords: Record[];
  filteredCount: number;
}

const fmt = (n: number) => n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ allRecords, filteredCount }) => {
  const totalAmount = allRecords.reduce((s, r) => s + r.item.amount, 0);
  const urgentCount = allRecords.filter(r => r.item.urgent_payment).length;
  const zeroCount = allRecords.filter(r => r.item.amount === 0).length;

  const metrics = [
    {
      label: 'ZAPISI',
      value: allRecords.length.toString(),
      sub: filteredCount < allRecords.length ? `${filteredCount} prikazano` : 'svi prikazani',
      icon: <FileText className="h-4 w-4 text-brand-600" />,
      iconBg: 'bg-brand-50',
      valueColor: 'text-gray-900',
    },
    {
      label: 'UKUPAN IZNOS',
      value: `${fmt(totalAmount)} RSD`,
      sub: 'ukupna vrednost obaveza',
      icon: <TrendingUp className="h-4 w-4 text-success-600" />,
      iconBg: 'bg-success-50',
      valueColor: 'text-gray-900',
    },
    {
      label: 'HITNA PLAĆANJA',
      value: urgentCount.toString(),
      sub: urgentCount > 0 ? 'zahtevaju pažnju' : 'nema hitnih',
      icon: <AlertTriangle className="h-4 w-4" />,
      iconBg: urgentCount > 0 ? 'bg-error-50' : 'bg-gray-100',
      iconColor: urgentCount > 0 ? 'text-error-600' : 'text-gray-400',
      valueColor: urgentCount > 0 ? 'text-error-600' : 'text-gray-900',
    },
    {
      label: 'NULTI IZNOSI',
      value: zeroCount.toString(),
      sub: zeroCount > 0 ? 'zahtevaju proveru' : 'sve ok',
      icon: <CircleDollarSign className="h-4 w-4" />,
      iconBg: zeroCount > 0 ? 'bg-warning-50' : 'bg-gray-100',
      iconColor: zeroCount > 0 ? 'text-warning-600' : 'text-gray-400',
      valueColor: zeroCount > 0 ? 'text-warning-600' : 'text-gray-900',
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="card p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{m.label}</p>
              <p className={`mt-1.5 text-2xl font-bold leading-tight ${m.valueColor}`}>{m.value}</p>
              <p className="mt-0.5 text-xs text-gray-400">{m.sub}</p>
            </div>
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${m.iconBg}`}>
              {React.cloneElement(m.icon as React.ReactElement, { className: `h-4 w-4 ${(m as any).iconColor || ''}` })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
