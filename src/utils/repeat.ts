import { RepeatRule } from '../models/Task';
import { addDays, addMonths, endOfDay } from './date';

/**
 * 반복(repeat) 관련 순수 함수 — 단위 테스트 대상.
 */

/** 반복 칩에 표시할 라벨. */
export function repeatLabel(rule: RepeatRule): string {
  switch (rule) {
    case 'daily':
      return '매일';
    case 'weekly':
      return '매주';
    case 'monthly':
      return '매월';
  }
}

/** 반복 순환: 없음 → 매일 → 매주 → 매월 → 없음. */
export function nextRepeat(current: RepeatRule | undefined): RepeatRule | undefined {
  if (current == null) return 'daily';
  if (current === 'daily') return 'weekly';
  if (current === 'weekly') return 'monthly';
  return undefined;
}

/**
 * 다음 주기의 마감일을 계산한다.
 * 기준(base)은 기존 마감일이 있으면 그것, 없으면 now.
 * 결과는 '그 날 끝'으로 정규화한다.
 */
export function nextDueForRepeat(
  base: number | undefined,
  rule: RepeatRule,
  now: number
): number {
  const from = base ?? now;
  switch (rule) {
    case 'daily':
      return endOfDay(addDays(from, 1));
    case 'weekly':
      return endOfDay(addDays(from, 7));
    case 'monthly':
      return endOfDay(addMonths(from, 1));
  }
}
