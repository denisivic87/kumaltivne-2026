import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastData; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 150);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle className="h-4 w-4 text-success-600" />,
    error: <AlertTriangle className="h-4 w-4 text-error-600" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning-600" />,
    info: <CheckCircle className="h-4 w-4 text-brand-600" />,
  };

  const bg = {
    success: 'border-success-200/60',
    error: 'border-error-200/60',
    warning: 'border-warning-200/60',
    info: 'border-brand-500/30',
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-dropdown transition-all duration-150 ${bg[toast.type]} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{ minWidth: 280, maxWidth: 400 }}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium text-gray-900">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-gray-400 transition hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const addToast = React.useCallback((type: ToastData['type'], message: string) => {
    const id = `toast-${idRef.current++}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
};
