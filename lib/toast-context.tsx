'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: 'success', title, message }),
    [addToast]
  );
  const error = useCallback(
    (title: string, message?: string) => addToast({ type: 'error', title, message }),
    [addToast]
  );
  const info = useCallback(
    (title: string, message?: string) => addToast({ type: 'info', title, message }),
    [addToast]
  );
  const warning = useCallback(
    (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info, warning }}
    >
      {children}
      {/* Toast container overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
            info: <Info className="w-4 h-4 text-[#4285F4] shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          };

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0e1526]/95 backdrop-blur-md p-3.5 shadow-xl transition-all duration-200 animate-in slide-in-from-bottom-5',
                toast.type === 'success' && 'border-l-4 border-l-emerald-500',
                toast.type === 'error' && 'border-l-4 border-l-rose-500',
                toast.type === 'info' && 'border-l-4 border-l-[#4285F4]',
                toast.type === 'warning' && 'border-l-4 border-l-amber-500'
              )}
            >
              <div className="mt-0.5">{icons[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
