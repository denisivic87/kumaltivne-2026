import React from 'react';
import { Record } from '../types/records';
import { TrendingUp, Users, AlertTriangle, FileText } from 'lucide-react';

interface Props {
  allRecords: Record[];
  filteredCount: number;
}

export const StatsBar: React.FC<Props> = ({ allRecords, filteredCount }) => {
  const totalAmount = allRecords.reduce((s, r) => s + r.item.amount, 0);
  const urgentCount = allRecords.filter(r => r.item.urgent_payment).length;
  const zeroCount = allRecords.filter(r => r.item.amount === 0).length;

  const uniqueRecipients = new Set(allRecords.map(r => r.recipient.trim()).filter(Boolean)).size;

  const fmt = (n: number) => n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cards = [
    {
      label: 'Ukupno zapisa',
      value: allRecords.length.toString(),
      sub: filteredCount < allRecords.length ? `${filteredCount} prikazano` : 'svi prikazani',
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
    },
    {
      label: 'Ukupan iznos',
      value: `${fmt(totalAmount)} RSD`,
      sub: `${uniqueRecipients} primalac${uniqueRecipients !== 1 ? 'a' : ''}`,
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
    },
    {
      label: 'Hitna plaćanja',
      value: urgentCount.toString(),
      sub: urgentCount > 0 ? `${((urgentCount / allRecords.length) * 100).toFixed(0)}% od ukupnog` : 'nema hitnih',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      bg: urgentCount > 0 ? 'bg-red-50' : 'bg-gray-50',
      border: urgentCount > 0 ? 'border-red-200' : 'border-gray-200',
      text: urgentCount > 0 ? 'text-red-900' : 'text-gray-900',
    },
    {
      label: 'Nulti iznosi',
      value: zeroCount.toString(),
      sub: zeroCount > 0 ? 'zahtevaju pažnju' : 'sve ok',
      icon: <Users className="h-5 w-5 text-amber-600" />,
      bg: zeroCount > 0 ? 'bg-amber-50' : 'bg-gray-50',
      border: zeroCount > 0 ? 'border-amber-200' : 'border-gray-200',
      text: zeroCount > 0 ? 'text-amber-900' : 'text-gray-900',
    },
  ];

  if (allRecords.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl px-4 py-3 flex items-start space-x-3`}>
          <div className="mt-0.5">{card.icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{card.label}</p>
            <p className={`text-lg font-bold ${card.text} leading-tight truncate`}>{card.value}</p>
            <p className="text-xs text-gray-500 truncate">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
