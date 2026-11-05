'use client';

import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, X, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeviceRecommendationBannerProps {
  className?: string;
  forceShowMobileNotice?: boolean;
}

export function DeviceRecommendationBanner({
  className,
  forceShowMobileNotice = false,
}: DeviceRecommendationBannerProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  if (dismissed) return null;
  if (!isMobileViewport && !forceShowMobileNotice) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-300/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 p-3 sm:p-3.5 text-xs text-amber-900 dark:text-amber-200 transition-all flex items-start gap-3 shadow-sm',
        className
      )}
    >
      <div className="p-1 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
        <Laptop className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-900 dark:text-amber-100">
          <span>Desktop or Laptop Recommended for Lab Execution</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
          You are viewing GDG LabOps on a mobile/tablet viewport. While you can read instructions and review progress on any device, <strong>terminal-heavy exercises</strong> with complex CLI typing, signals, and hotkeys are significantly more convenient on a physical keyboard.
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 rounded transition-colors"
        aria-label="Dismiss recommendation"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
