import { Task } from '../models/Task';
import { endOfDay } from './date';

/**
 * "오늘 보기" 도메인 로직 (순수 함수 — 화면과 분리, 단위 테스트 대상)
 */

/**
 * 오늘 보기에 노출할 할일인가?
 * - 마감 미지정: 노출
 * - 마감이 오늘이거나 지난 것: 노출 (오늘 처리해야 할 일)
 * - 마감이 미래(내일 이후): 숨김
 */
export function isInTodayView(task: Task, now: number): boolean {
  if (task.dueDate == null) return true;
  return task.dueDate <= endOfDay(now);
}

/**
 * 정렬 기준:
 * 1) 미완료가 위, 완료가 아래
 * 2) 마감 임박 순(빠른 마감이 위), 미지정은 맨 뒤
 * 3) 동률이면 sortOrder
 */
export function compareTodayTasks(a: Task, b: Task): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  const da = a.dueDate ?? Number.POSITIVE_INFINITY;
  const db = b.dueDate ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return a.sortOrder - b.sortOrder;
}

/** 오늘 보기 목록(필터 + 정렬). */
export function selectTodayTasks(tasks: Task[], now: number): Task[] {
  return tasks.filter((t) => isInTodayView(t, now)).sort(compareTodayTasks);
}

/** 전체 보기 목록(정렬만, 같은 정렬 규칙 사용). */
export function selectAllTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTodayTasks);
}

/** "오늘 N개 중 M개 완료" 카운트. */
export function todayProgress(tasks: Task[], now: number): { total: number; done: number } {
  const today = tasks.filter((t) => isInTodayView(t, now));
  return { total: today.length, done: today.filter((t) => t.completed).length };
}
