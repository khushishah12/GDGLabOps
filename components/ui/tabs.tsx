'use client';

import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-start rounded-lg bg-slate-100 dark:bg-slate-900/80 p-1 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  badge,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
  badge?: string | number;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
          : 'hover:text-slate-900 dark:hover:text-slate-200',
        className
      )}
    >
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'ml-1.5 px-1.5 py-0.2 rounded-full text-[10px]',
            isActive
              ? 'bg-[#1a73e8]/10 text-[#1a73e8] dark:bg-[#4285F4]/20 dark:text-[#4285F4]'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.value !== value) return null;

  return <div className={cn('mt-4 focus-visible:outline-none', className)}>{children}</div>;
}
