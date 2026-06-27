/**
 * 현재 시각 → 시간대 판정 (순수 함수, 테스트 대상).
 * 전역 Date를 직접 호출하지 않고 인자로 받은 date의 getHours()만 사용한다(mock 가능).
 */
export type TimeOfDay = 'dawn' | 'morning' | 'day' | 'night';

export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 8) return 'dawn'; // 05:00–07:59
  if (h >= 8 && h < 12) return 'morning'; // 08:00–11:59
  if (h >= 12 && h < 18) return 'day'; // 12:00–17:59
  return 'night'; // 18:00–04:59
}
