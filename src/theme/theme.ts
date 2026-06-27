/**
 * 테마 토큰 (라이트/다크). 색을 한곳에 모아 다크모드 + 접근성 대비(M1)를 함께 해결한다.
 * 회색 텍스트는 WCAG AA(4.5:1)를 의식해 충분히 진하게 잡았다.
 */
export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  danger: string;
  dangerBg: string;
  priorityHigh: string;
  priorityMed: string;
  priorityLow: string;
}

export const lightTheme: Theme = {
  mode: 'light',
  bg: '#ffffff',
  surface: '#f5f7fa',
  surfaceAlt: '#e9edf3',
  border: '#dde1e8',
  text: '#14161a',
  textMuted: '#4f5763', // AA on white
  textFaint: '#6b7280', // AA on white
  primary: '#2f6fed',
  onPrimary: '#ffffff',
  danger: '#c8322f',
  dangerBg: '#fdecea',
  priorityHigh: '#d6453f',
  priorityMed: '#c9810a',
  priorityLow: '#2f9461',
};

export const darkTheme: Theme = {
  mode: 'dark',
  bg: '#15171c',
  surface: '#1e2128',
  surfaceAlt: '#272b34',
  border: '#2d323d',
  text: '#f1f3f5',
  textMuted: '#aab2bf', // AA on dark bg
  textFaint: '#8b94a3',
  primary: '#5b8cff',
  onPrimary: '#0b1220',
  danger: '#ff6b6b',
  dangerBg: '#3a2526',
  priorityHigh: '#ff6b6b',
  priorityMed: '#f5b544',
  priorityLow: '#4cc38a',
};

export function themeFor(mode: ThemeMode): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
