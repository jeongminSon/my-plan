import { Task } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { generateId } from '../utils/id';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (s: string | undefined | null): boolean => !!s && UUID_RE.test(s);

/**
 * 마이그레이션 전, 비-UUID id(예: 예전 'time36-rand' 형식)를 UUID로 정규화한다.
 * - Supabase의 uuid 컬럼에 들어가도록 task.id / list.id 를 UUID로
 * - task.listId 참조도 새 list id로 매핑(매핑 없고 비UUID면 고아 참조 방지 위해 제거)
 * 이미 UUID인 id는 그대로 둔다(멱등).
 */
export function sanitizeIds(
  tasks: Task[],
  lists: TaskList[],
  newId: () => string = generateId
): { tasks: Task[]; lists: TaskList[] } {
  const listIdMap = new Map<string, string>();
  const newLists = lists.map((l) => {
    const id = isUuid(l.id) ? l.id : newId();
    listIdMap.set(l.id, id);
    return { ...l, id };
  });
  const newTasks = tasks.map((t) => {
    const id = isUuid(t.id) ? t.id : newId();
    let listId = t.listId;
    if (listId) {
      const mapped = listIdMap.get(listId);
      listId = mapped ?? (isUuid(listId) ? listId : undefined);
    }
    return { ...t, id, listId };
  });
  return { tasks: newTasks, lists: newLists };
}
