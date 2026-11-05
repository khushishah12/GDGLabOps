import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'destructive' | 'domain';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const base = 'inline-flex items-center font-medium transition-colors select-none rounded-full';

  const dangerStyle =
    'bg-rose-50 dark:bg-rose-950/50 text-[#d93025] dark:text-[#EA4335] border border-rose-200 dark:border-rose-800/60';

  const variants = {
    default:
      'bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-[#4285F4] border border-blue-200 dark:border-blue-800/60',
    secondary:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60',
    outline:
      'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-transparent',
    success:
      'bg-emerald-50 dark:bg-emerald-950/50 text-[#1e8e3e] dark:text-[#34A853] border border-emerald-200 dark:border-emerald-800/60',
    warning:
      'bg-amber-50 dark:bg-amber-950/50 text-[#b06000] dark:text-[#FBBC04] border border-amber-200 dark:border-amber-800/60',
    danger: dangerStyle,
    destructive: dangerStyle,
    domain:
      'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 leading-none',
    md: 'text-xs px-2.5 py-0.5',
  };

  return (
    <div className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </div>
  );
}
