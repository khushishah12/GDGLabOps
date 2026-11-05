'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
  isDark: true,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'gdg-labops-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      if (storedTheme) {
        setTheme(storedTheme);
      }
    } catch {
      // LocalStorage access might fail in private windows or iframe
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let resolvedTheme: 'dark' | 'light' = 'dark';
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      resolvedTheme = systemTheme;
    } else {
      resolvedTheme = theme;
    }

    root.classList.add(resolvedTheme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Ignore
    }
  }, [theme, mounted, storageKey]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
    },
    isDark: theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
