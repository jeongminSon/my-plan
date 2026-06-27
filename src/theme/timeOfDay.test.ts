import { timeOfDay } from './timeOfDay';

/** 특정 시(hour)의 Date를 만든다(분/초는 0). */
function at(hour: number, min = 0): Date {
  return new Date(2026, 5, 28, hour, min, 0);
}

describe('timeOfDay 경계값', () => {
  it('dawn 05:00–07:59', () => {
    expect(timeOfDay(at(5))).toBe('dawn');
    expect(timeOfDay(at(7, 59))).toBe('dawn');
    expect(timeOfDay(at(4, 59))).toBe('night'); // 경계 직전
  });

  it('morning 08:00–11:59', () => {
    expect(timeOfDay(at(8))).toBe('morning');
    expect(timeOfDay(at(11, 59))).toBe('morning');
  });

  it('day 12:00–17:59', () => {
    expect(timeOfDay(at(12))).toBe('day');
    expect(timeOfDay(at(17, 59))).toBe('day');
  });

  it('night 18:00–04:59 (자정 가로지름)', () => {
    expect(timeOfDay(at(18))).toBe('night');
    expect(timeOfDay(at(23, 59))).toBe('night');
    expect(timeOfDay(at(0))).toBe('night'); // 자정 직후
    expect(timeOfDay(at(4, 59))).toBe('night');
  });
});
