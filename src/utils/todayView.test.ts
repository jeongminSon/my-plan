import { Task } from '../models/Task';
import { addDays, endOfDay } from './date';
import {
  compareTodayTasks,
  isInTodayView,
  selectTodayTasks,
  todayProgress,
} from './todayView';

const NOW = new Date(2026, 5, 27, 10, 0, 0).getTime();

function task(partial: Partial<Task>): Task {
  return {
    id: partial.id ?? 'id',
    title: partial.title ?? '제목',
    memo: partial.memo,
    dueDate: partial.dueDate,
    completed: partial.completed ?? false,
    createdAt: partial.createdAt ?? 0,
    sortOrder: partial.sortOrder ?? 0,
    updatedAt: partial.updatedAt ?? 0,
    deletedAt: partial.deletedAt,
    dirty: partial.dirty ?? false,
  };
}

describe('isInTodayView', () => {
  it('미지정/오늘/지남은 노출, 미래는 숨김', () => {
    expect(isInTodayView(task({ dueDate: undefined }), NOW)).toBe(true);
    expect(isInTodayView(task({ dueDate: endOfDay(NOW) }), NOW)).toBe(true);
    expect(isInTodayView(task({ dueDate: endOfDay(addDays(NOW, -1)) }), NOW)).toBe(true);
    expect(isInTodayView(task({ dueDate: endOfDay(addDays(NOW, 1)) }), NOW)).toBe(false);
  });
});

describe('compareTodayTasks (마감 임박 순)', () => {
  it('미완료가 위, 마감 빠른 순, 미지정은 뒤, 완료는 맨 아래', () => {
    const overdue = task({ id: 'overdue', dueDate: endOfDay(addDays(NOW, -1)) });
    const today = task({ id: 'today', dueDate: endOfDay(NOW) });
    const undated = task({ id: 'undated', dueDate: undefined });
    const doneOne = task({ id: 'done', completed: true, dueDate: endOfDay(addDays(NOW, -2)) });

    const sorted = [undated, doneOne, today, overdue].sort(compareTodayTasks);
    expect(sorted.map((t) => t.id)).toEqual(['overdue', 'today', 'undated', 'done']);
  });
});

describe('selectTodayTasks', () => {
  it('미래 항목은 빠지고 임박 순으로 정렬된다', () => {
    const tasks = [
      task({ id: 'future', dueDate: endOfDay(addDays(NOW, 3)) }),
      task({ id: 'undated' }),
      task({ id: 'today', dueDate: endOfDay(NOW) }),
    ];
    expect(selectTodayTasks(tasks, NOW).map((t) => t.id)).toEqual(['today', 'undated']);
  });
});

describe('todayProgress', () => {
  it('오늘 보기 대상 중 완료 개수를 센다', () => {
    const tasks = [
      task({ id: 'a', completed: true }),
      task({ id: 'b', completed: false }),
      task({ id: 'future', completed: true, dueDate: endOfDay(addDays(NOW, 2)) }), // 제외
    ];
    expect(todayProgress(tasks, NOW)).toEqual({ total: 2, done: 1 });
  });
});
