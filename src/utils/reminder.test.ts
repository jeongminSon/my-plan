import { nextReminder, reminderLabel, tomorrowMorning } from './reminder';

const NOW = new Date(2026, 5, 27, 10, 0, 0).getTime();

describe('nextReminder (순환)', () => {
  it('없음 → 1시간 후 → 내일 오전 9시 → 없음', () => {
    const r1 = nextReminder(undefined, NOW);
    expect(r1).toBe(NOW + 60 * 60 * 1000); // 1시간 후

    const r2 = nextReminder(r1, NOW);
    expect(r2).toBe(tomorrowMorning(NOW)); // 내일 오전 9시

    const r3 = nextReminder(r2, NOW);
    expect(r3).toBeUndefined();
  });
});

describe('reminderLabel', () => {
  it('오늘/내일 + HH:MM', () => {
    expect(reminderLabel(new Date(2026, 5, 27, 14, 30).getTime(), NOW)).toBe('오늘 14:30');
    expect(reminderLabel(tomorrowMorning(NOW), NOW)).toBe('내일 09:00');
  });
});
