import { TaskList } from '../models/TaskList';

/**
 * 목록 순환 (순수 함수 — 단위 테스트 대상)
 * 현재 목록 → 다음 목록 → ... → 마지막 → 미지정(undefined) → 첫 목록 ...
 */
export function nextListId(
  current: string | undefined,
  lists: TaskList[]
): string | undefined {
  if (lists.length === 0) return undefined;
  // 순환 순서: [미지정, list0, list1, ...]
  const order: (string | undefined)[] = [undefined, ...lists.map((l) => l.id)];
  const idx = order.findIndex((id) => id === current);
  // 현재가 목록에 없으면(삭제된 목록 등) 미지정으로 간주
  const safeIdx = idx === -1 ? 0 : idx;
  return order[(safeIdx + 1) % order.length];
}

/** 목록 id → 이름 (없으면 undefined). */
export function listNameOf(listId: string | undefined, lists: TaskList[]): string | undefined {
  if (listId == null) return undefined;
  return lists.find((l) => l.id === listId)?.name;
}
