import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type Theme = 'terracotta' | 'nuit' | 'ocean' | 'savane' | 'foret' | 'couchant';
export type DisplayMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
}

const DEFAULT_THEME: Theme = 'terracotta';
const DEFAULT_DISPLAY_MODE: DisplayMode = 'light';
const ALL_THEMES: Theme[] = ['terracotta', 'nuit', 'ocean', 'savane', 'foret', 'couchant'];

const ThemeContext = createContext<ThemeContextValue | null>(null);

function storageKey(userId: string | undefined, suffix: string): string {
  return userId ? `inventory-${suffix}-${userId}` : `inventory-${suffix}`;
}

function readStored<T extends string>(key: string, valid: T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v && (valid as string[]).includes(v)) return v as T;
  } catch { /* unavailable */ }
  return fallback;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  ALL_THEMES.forEach((t) => root.classList.remove(`theme-${t}`));
  root.classList.add(`theme-${theme}`);
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(colorTheme: Theme, displayMode: DisplayMode): Theme {
  if (displayMode === 'dark') return 'nuit';
  if (displayMode === 'system') return systemPrefersDark() ? 'nuit' : colorTheme;
  return colorTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.id;

  const [colorTheme, setColorThemeState] = useState<Theme>(() =>
    readStored(storageKey(userId, 'theme'), ALL_THEMES, DEFAULT_THEME)
  );
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() =>
    readStored(storageKey(userId, 'display-mode'), ['light', 'dark', 'system'], DEFAULT_DISPLAY_MODE)
  );

  // Reload prefs when user switches
  useEffect(() => {
    const t = readStored(storageKey(userId, 'theme'), ALL_THEMES, DEFAULT_THEME);
    const d = readStored(storageKey(userId, 'display-mode'), ['light', 'dark', 'system'] as DisplayMode[], DEFAULT_DISPLAY_MODE);
    setColorThemeState(t);
    setDisplayModeState(d);
  }, [userId]);

  // Apply resolved theme to <html>
  useEffect(() => {
    applyTheme(resolveTheme(colorTheme, displayMode));
  }, [colorTheme, displayMode]);

  // OS color-scheme listener for system mode
  useEffect(() => {
    if (displayMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(resolveTheme(colorTheme, 'system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [colorTheme, displayMode]);

  function setTheme(next: Theme): void {
    setColorThemeState(next);
    try { localStorage.setItem(storageKey(userId, 'theme'), next); } catch { /* unavailable */ }
  }

  function setDisplayMode(next: DisplayMode): void {
    setDisplayModeState(next);
    try { localStorage.setItem(storageKey(userId, 'display-mode'), next); } catch { /* unavailable */ }
  }

  const resolvedTheme = resolveTheme(colorTheme, displayMode);

  return (
    <ThemeContext.Provider value={{ theme: colorTheme, resolvedTheme, setTheme, displayMode, setDisplayMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
}
