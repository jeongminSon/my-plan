import { Task } from '../models/Task';
import { startOfDay } from './date';
import { isInTodayView } from './todayView';

/**
 * 진행 통계 (순수 함수 — 단위 테스트 대상).
 * 완료 시각은 updatedAt(완료 토글 시 갱신됨)을 근사값으로 사용한다.
 */

/** 이번 주(월요일 0시) 시작 epoch ms. */
export function startOfWeek(now: number): number {
  const d = new Date(startOfDay(now));
  const day = d.getDay(); // 0=일 ... 1=월
  const diff = (day + 6) % 7; // 월요일까지 거슬러 갈 일수
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

export interface Stats {
  /** 오늘 보기 대상의 완료율 */
  today: { total: number; done: number; rate: number };
  /** 이번 주 완료한 할일 수(동기부여 지표) */
  weekDone: number;
}

function rate(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100) / 100;
}

export function computeStats(tasks: Task[], now: number): Stats {
  const todayTasks = tasks.filter((t) => isInTodayView(t, now));
  const todayDone = todayTasks.filter((t) => t.completed).length;
  const weekStart = startOfWeek(now);
  const weekDone = tasks.filter((t) => t.completed && t.updatedAt >= weekStart).length;
  return {
    today: { total: todayTasks.length, done: todayDone, rate: rate(todayDone, todayTasks.length) },
    weekDone,
  };
}
