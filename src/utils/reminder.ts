import { dayDiff, formatDate } from './date';

/**
 * 알림 시각 관련 순수 함수 — 단위 테스트 대상.
 *
 * 전용 시간 선택 UI 대신 빠른 순환으로 시각을 정한다(군더더기 최소화):
 *   없음 → 1시간 후 → 내일 오전 9시 → 없음
 */

/** 내일 오전 9시(로컬)의 epoch ms. */
export function tomorrowMorning(now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

/** 알림 시각 순환. */
export function nextReminder(current: number | undefined, now: number): number | undefined {
  const inOneHour = now + 60 * 60 * 1000;
  const t9 = tomorrowMorning(now);
  if (current == null) return inOneHour; // 없음 → 1시간 후
  if (current < t9) return t9; // 1시간 후 → 내일 오전 9시
  return undefined; // 내일 오전 9시 → 없음
}

/** 알림 칩에 표시할 라벨 (예: "오늘 14:30", "내일 09:00"). */
export function reminderLabel(at: number, now: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const off = dayDiff(now, at);
  const prefix =
    off === 0 ? '오늘' : off === 1 ? '내일' : formatDate(at).slice(5).replace('-', '/');
  return `${prefix} ${hh}:${mm}`;
}
