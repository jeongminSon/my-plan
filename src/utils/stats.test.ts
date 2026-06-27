import { Task } from '../models/Task';
import { addDays, endOfDay } from './date';
import { computeStats, startOfWeek } from './stats';

const NOW = new Date(2026, 5, 27, 10, 0, 0).getTime(); // 2026-06-27 (토)

function task(p: Partial<Task>): Task {
  return {
    id: p.id ?? 'id',
    title: p.title ?? '제목',
    completed: p.completed ?? false,
    createdAt: p.createdAt ?? 0,
    sortOrder: p.sortOrder ?? 0,
    updatedAt: p.updatedAt ?? NOW,
    dirty: false,
    dueDate: p.dueDate,
  };
}

describe('startOfWeek', () => {
  it('월요일 0시를 반환한다', () => {
    const s = new Date(startOfWeek(NOW));
    expect(s.getDay()).toBe(1); // 월요일
    expect(s.getHours()).toBe(0);
  });
});

describe('computeStats', () => {
  it('오늘 완료율을 계산한다', () => {
    const tasks = [
      task({ id: 'a', completed: true }),
      task({ id: 'b', completed: false }),
      task({ id: 'c', completed: true }),
      task({ id: 'future', completed: false, dueDate: endOfDay(addDays(NOW, 3)) }), // 오늘 제외
    ];
    const s = computeStats(tasks, NOW);
    expect(s.today.total).toBe(3);
    expect(s.today.done).toBe(2);
    expect(s.today.rate).toBeCloseTo(0.67, 2);
  });

  it('이번 주 완료 개수를 센다(지난주 완료는 제외)', () => {
    const lastWeek = startOfWeek(NOW) - 1;
    const tasks = [
      task({ id: 'a', completed: true, updatedAt: NOW }),
      task({ id: 'b', completed: true, updatedAt: lastWeek }), // 지난주 → 제외
      task({ id: 'c', completed: false, updatedAt: NOW }),
    ];
    expect(computeStats(tasks, NOW).weekDone).toBe(1);
  });
});
