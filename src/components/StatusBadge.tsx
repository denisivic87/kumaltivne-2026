import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Circle } from 'lucide-react';

interface StatusBadgeProps {
  type: 'valid' | 'warning' | 'error' | 'urgent' | 'not-urgent';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-sm px-2.5 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  const config = {
    valid: {
      icon: <CheckCircle className={iconSize} />,
      label: 'Validno',
      classes: 'bg-success-50 text-success-600 border border-success-200/60',
    },
    warning: {
      icon: <AlertTriangle className={iconSize} />,
      label: 'Upozorenje',
      classes: 'bg-warning-50 text-warning-600 border border-warning-200/60',
    },
    error: {
      icon: <XCircle className={iconSize} />,
      label: 'Greška',
      classes: 'bg-error-50 text-error-600 border border-error-200/60',
    },
    urgent: {
      icon: <Circle className={`${iconSize} fill-current`} />,
      label: 'Hitno',
      classes: 'bg-error-50 text-error-600 border border-error-200/60',
    },
    'not-urgent': {
      icon: <Circle className={iconSize} />,
      label: 'Nije hitno',
      classes: 'bg-gray-100 text-gray-500 border border-gray-200',
    },
  };

  const c = config[type];
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${c.classes} ${sizeClasses}`}>
      {c.icon}
      {c.label}
    </span>
  );
};
