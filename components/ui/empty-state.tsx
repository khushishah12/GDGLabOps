import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-slate-50/40 dark:bg-slate-900/20',
        className
      )}
    >
      {icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
