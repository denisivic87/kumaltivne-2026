import React from 'react';
import { CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { ValidationError } from '../types/records';

interface ValidationStatusProps {
  errors: ValidationError[];
  onShowErrors?: () => void;
  lastChecked?: string;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({ errors, onShowErrors, lastChecked }) => {
  const hasErrors = errors.length > 0;

  if (!hasErrors) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-lg border border-success-200/60 bg-success-50 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <CheckCircle className="h-4 w-4 text-success-600" />
          <span className="text-sm font-medium text-success-600">Svi zapisi su validni</span>
          {lastChecked && <span className="text-xs text-gray-400">· Provereno {lastChecked}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-warning-200/60 bg-warning-50 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 text-warning-600" />
        <span className="text-sm font-medium text-warning-600">
          {errors.length} {errors.length === 1 ? 'zapis zahteva proveru' : 'zapisa zahtevaju proveru'}
        </span>
      </div>
      {onShowErrors && (
        <button
          onClick={onShowErrors}
          className="flex items-center gap-1 text-sm font-medium text-warning-600 transition hover:text-warning-700"
        >
          Prikaži probleme
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
