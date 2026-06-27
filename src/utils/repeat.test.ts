import { dayDiff, endOfDay } from './date';
import { nextDueForRepeat, nextRepeat, repeatLabel } from './repeat';

const NOW = new Date(2026, 5, 27, 10, 0, 0).getTime();

describe('repeatLabel', () => {
  it('주기 라벨', () => {
    expect(repeatLabel('daily')).toBe('매일');
    expect(repeatLabel('weekly')).toBe('매주');
    expect(repeatLabel('monthly')).toBe('매월');
  });
});

describe('nextRepeat (순환)', () => {
  it('없음 → 매일 → 매주 → 매월 → 없음', () => {
    expect(nextRepeat(undefined)).toBe('daily');
    expect(nextRepeat('daily')).toBe('weekly');
    expect(nextRepeat('weekly')).toBe('monthly');
    expect(nextRepeat('monthly')).toBeUndefined();
  });
});

describe('nextDueForRepeat', () => {
  it('마감일 기준으로 다음 주기를 계산한다', () => {
    const today = endOfDay(NOW);
    expect(dayDiff(NOW, nextDueForRepeat(today, 'daily', NOW))).toBe(1);
    expect(dayDiff(NOW, nextDueForRepeat(today, 'weekly', NOW))).toBe(7);
  });

  it('월간은 한 달 뒤', () => {
    const next = nextDueForRepeat(endOfDay(NOW), 'monthly', NOW);
    expect(new Date(next).getMonth()).toBe(6); // 5(6월) → 6(7월)
  });

  it('마감일이 없으면 now 기준', () => {
    expect(dayDiff(NOW, nextDueForRepeat(undefined, 'daily', NOW))).toBe(1);
  });
});
