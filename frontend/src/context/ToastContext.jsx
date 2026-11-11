import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full no-print">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-50 border-emerald-500 text-emerald-900',
            error: 'bg-red-50 border-red-500 text-red-900',
            warning: 'bg-amber-50 border-amber-500 text-amber-900',
            info: 'bg-blue-50 border-blue-500 text-blue-900',
          }[toast.type];

          const IconComponent = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertTriangle,
            info: Info,
          }[toast.type];

          const iconColor = {
            success: 'text-emerald-600',
            error: 'text-red-600',
            warning: 'text-amber-600',
            info: 'text-blue-600',
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start p-3.5 rounded-lg border shadow-lg transition-all transform duration-200 animate-in slide-in-from-bottom-3 ${typeStyles}`}
            >
              <IconComponent className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="text-sm font-medium flex-1 leading-snug">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-charcoal-400 hover:text-charcoal-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
