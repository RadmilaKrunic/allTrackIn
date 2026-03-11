import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { THEMES, DEFAULT_THEME, ThemeVars } from '../themes/themes';

interface ThemeContextValue {
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  themes: Record<string, ThemeVars>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>(
    () => localStorage.getItem('alltrack-theme') ?? DEFAULT_THEME
  );

  useEffect(() => {
    const theme = THEMES[currentTheme] ?? THEMES[DEFAULT_THEME];
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (key.startsWith('--')) root.style.setProperty(key, value as string);
    });
    localStorage.setItem('alltrack-theme', currentTheme);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
