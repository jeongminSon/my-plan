import {
  addDays,
  dayDiff,
  dueDateLabel,
  endOfDay,
  isOverdue,
  isToday,
  nextDueDate,
  startOfDay,
} from './date';

// 기준 시각: 2026-06-27 (토) 10:00 (로컬)
const NOW = new Date(2026, 5, 27, 10, 0, 0).getTime();

describe('startOfDay / endOfDay', () => {
  it('startOfDay는 0시, endOfDay는 23:59:59.999', () => {
    const s = new Date(startOfDay(NOW));
    const e = new Date(endOfDay(NOW));
    expect([s.getHours(), s.getMinutes(), s.getSeconds()]).toEqual([0, 0, 0]);
    expect([e.getHours(), e.getMinutes(), e.getSeconds()]).toEqual([23, 59, 59]);
  });
});

describe('dayDiff / isToday', () => {
  it('오늘은 0, 내일은 1, 어제는 -1', () => {
    expect(dayDiff(NOW, NOW)).toBe(0);
    expect(dayDiff(NOW, addDays(NOW, 1))).toBe(1);
    expect(dayDiff(NOW, addDays(NOW, -1))).toBe(-1);
  });

  it('isToday', () => {
    expect(isToday(endOfDay(NOW), NOW)).toBe(true);
    expect(isToday(endOfDay(addDays(NOW, 1)), NOW)).toBe(false);
    expect(isToday(undefined, NOW)).toBe(false);
  });
});

describe('isOverdue', () => {
  it('당일 마감(그 날 끝)은 지나지 않은 것', () => {
    expect(isOverdue(endOfDay(NOW), NOW)).toBe(false);
  });
  it('어제 마감은 지난 것', () => {
    expect(isOverdue(endOfDay(addDays(NOW, -1)), NOW)).toBe(true);
  });
});

describe('dueDateLabel', () => {
  it('상대 날짜 라벨', () => {
    expect(dueDateLabel(endOfDay(NOW), NOW)).toBe('오늘');
    expect(dueDateLabel(endOfDay(addDays(NOW, 1)), NOW)).toBe('내일');
    expect(dueDateLabel(endOfDay(addDays(NOW, 2)), NOW)).toBe('모레');
    expect(dueDateLabel(endOfDay(addDays(NOW, -1)), NOW)).toBe('어제');
  });
  it('먼 날짜는 MM/DD', () => {
    expect(dueDateLabel(endOfDay(addDays(NOW, 5)), NOW)).toBe('07/02');
  });
});

describe('nextDueDate (순환)', () => {
  it('미지정 → 오늘 → 내일 → 모레 → 미지정', () => {
    const d1 = nextDueDate(undefined, NOW);
    expect(dueDateLabel(d1!, NOW)).toBe('오늘');
    const d2 = nextDueDate(d1, NOW);
    expect(dueDateLabel(d2!, NOW)).toBe('내일');
    const d3 = nextDueDate(d2, NOW);
    expect(dueDateLabel(d3!, NOW)).toBe('모레');
    const d4 = nextDueDate(d3, NOW);
    expect(d4).toBeUndefined();
  });

  it('지난 날짜는 다음에 내일로', () => {
    const past = endOfDay(addDays(NOW, -3));
    expect(dueDateLabel(nextDueDate(past, NOW)!, NOW)).toBe('내일');
  });
});
