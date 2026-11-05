import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 p-6 text-center',
        className
      )}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-rose-600 dark:text-rose-400">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
