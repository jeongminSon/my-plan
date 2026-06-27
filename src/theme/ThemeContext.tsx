import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeMode, ThemePreference, themeFor } from './theme';
import { injectWebA11yStyles, setBrandVar } from './webA11y';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * 테마 제공자.
 * - preference 'system': 기기 설정(useColorScheme)을 따른다
 * - 'light' / 'dark': 사용자가 직접 고정
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreference] = useState<ThemePreference>('system');

  const value = useMemo<ThemeContextValue>(() => {
    const mode: ThemeMode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return { theme: themeFor(mode), preference, setPreference };
  }, [preference, system]);

  // 웹: 전역 포커스 링/모션 스타일 1회 주입 + 브랜드색을 테마에 동기화
  useEffect(() => {
    injectWebA11yStyles();
  }, []);
  useEffect(() => {
    setBrandVar(value.theme.primary);
  }, [value.theme.primary]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
} {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemeProvider');
  return { preference: ctx.preference, setPreference: ctx.setPreference };
}
