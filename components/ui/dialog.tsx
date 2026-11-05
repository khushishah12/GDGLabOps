'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Dialog container */}
      <div className="relative z-50 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e1526] p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-150">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 space-y-1.5 text-left', className)}>{children}</div>;
}

export function DialogTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-slate-500 dark:text-slate-400', className)}>{children}</p>;
}

export function DialogFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2', className)}>
      {children}
    </div>
  );
}
