import type { ThemeMode } from './theme';
import type { TimeOfDay } from './timeOfDay';

/**
 * 시간대 적응형 배경 색 토큰 (배경 장식 전용 — 워시/오브/외곽선).
 * 텍스트·카드·브랜드·상태색 토큰은 건드리지 않는다.
 * 불투명도는 색에 섞지 말고 컴포넌트에서 opacity로 제어(여기는 베이스 색만).
 */
export interface BgSet {
  wash: string; // 상단 워시
  orb1: string; // 주 오브
  orb2: string; // 보조 오브
  outline: string; // 외곽선 모티프
}

const light: Record<TimeOfDay, BgSet> = {
  dawn: { wash: '#ECEAFB', orb1: '#DCD9F5', orb2: '#E6E3F7', outline: '#D5D2F2' },
  morning: { wash: '#E8F1FC', orb1: '#DCE9F8', orb2: '#FCEEE6', outline: '#D8E6F8' },
  day: { wash: '#EEF1FE', orb1: '#E0E4FB', orb2: '#E9ECFE', outline: '#D8DFFB' },
  night: { wash: '#E6E7F2', orb1: '#DBDCEC', orb2: '#E1E2EF', outline: '#D2D4E6' },
};

const dark: Record<TimeOfDay, BgSet> = {
  dawn: { wash: '#1C1B2B', orb1: '#241F3A', orb2: '#1F1D30', outline: '#2E2A45' },
  morning: { wash: '#181C24', orb1: '#1B2740', orb2: '#211E1A', outline: '#243047' },
  day: { wash: '#171A22', orb1: '#20283F', orb2: '#1B2030', outline: '#2E3A5C' },
  night: { wash: '#15171F', orb1: '#1E2233', orb2: '#191B27', outline: '#262B3D' },
};

export function backgroundSet(mode: ThemeMode, tod: TimeOfDay): BgSet {
  return (mode === 'dark' ? dark : light)[tod];
}
