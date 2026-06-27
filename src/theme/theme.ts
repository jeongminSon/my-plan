/**
 * 테마 토큰 (라이트/다크). 색을 한곳에 모아 다크모드 + 접근성 대비(M1)를 함께 해결한다.
 * 회색 텍스트는 WCAG AA(4.5:1)를 의식해 충분히 진하게 잡았다.
 *
 * 디자인 시스템("Calm Focus"): 브랜드는 인디고(의미색과 비충돌), 색만이 아니라 형태로 상태 구분.
 * 색은 테마별(라이트/다크), 치수(type/space/radius/shadow)는 테마 무관 상수로 분리.
 */
import type { TextStyle, ViewStyle } from 'react-native';

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
  brandStrong: string; // hover/press·강조 텍스트
  brandTint: string; // 선택 칩·진행바 채움 배경·브랜드 헤일로
  brandBorder: string; // 브랜드 외곽선/구분선
  onPrimary: string;
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
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
  primary: '#3B5BDB', // 인디고 (흰 텍스트 대비 ≈5.0:1, AA)
  brandStrong: '#2C46B8',
  brandTint: '#EEF1FE',
  brandBorder: '#D8DFFB',
  onPrimary: '#ffffff',
  danger: '#c8322f',
  dangerBg: '#fdecea',
  success: '#1f7a4d', // 브랜드/오류 색과 구분되는 성공 초록 (AA on white)
  successBg: '#e6f4ec',
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
  primary: '#7C93FF',
  brandStrong: '#9DB0FF',
  brandTint: '#20283F',
  brandBorder: '#2E3A5C',
  onPrimary: '#0B1020',
  danger: '#ff6b6b',
  dangerBg: '#3a2526',
  success: '#4cc38a',
  successBg: '#1e2e26',
  priorityHigh: '#ff6b6b',
  priorityMed: '#f5b544',
  priorityLow: '#4cc38a',
};

export function themeFor(mode: ThemeMode): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}

// ─────────────────────────────────────────────────────────────
// 치수 토큰 (테마 무관 상수) — 컴포넌트 makeStyles에서 참조
// ─────────────────────────────────────────────────────────────

/** 타입 스케일 (1.25 비율). 글랜스 규칙: 오늘 핵심 수치는 xxxl(30) 이상. */
export const typeScale = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  hero: 40,
} as const;

/** 폰트 무게: 본문 600 · 라벨 700 · 숫자 800 */
export const weight = {
  body: '600',
  label: '700',
  number: '800',
} as const;

/** 간격 (4px 베이스) */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** 라운드 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** 그림자 (아주 옅게, 카드·모달에만). iOS/Android/web 호환 필드 포함. */
export const shadow: { sm: ViewStyle; md: ViewStyle } = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

/** 숫자(카운트·%·주간완료)에 적용하는 공통 스타일 — 자릿수 흔들림 방지 */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };
