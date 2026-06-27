import { Task } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { isUuid, sanitizeIds } from './sanitizeIds';

const UUID = '11111111-2222-4333-8444-555555555555';

function task(id: string, listId?: string): Task {
  return {
    id,
    title: 't',
    completed: false,
    createdAt: 1,
    sortOrder: 0,
    updatedAt: 1,
    dirty: false,
    subtasks: [],
    listId,
  };
}
function list(id: string): TaskList {
  return { id, name: 'L', createdAt: 1, sortOrder: 0, updatedAt: 1, dirty: false };
}

describe('isUuid', () => {
  it('UUID만 true', () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid('mqw4eplv-abcd')).toBe(false); // 예전 형식
    expect(isUuid(undefined)).toBe(false);
  });
});

describe('sanitizeIds', () => {
  let seq: number;
  const newId = () => `00000000-0000-4000-8000-00000000000${(seq++).toString(16)}`;
  beforeEach(() => {
    seq = 1;
  });

  it('비-UUID id를 새 UUID로, 이미 UUID는 유지', () => {
    const r = sanitizeIds([task('old-1'), task(UUID)], [], newId);
    expect(isUuid(r.tasks[0].id)).toBe(true);
    expect(r.tasks[0].id).not.toBe('old-1');
    expect(r.tasks[1].id).toBe(UUID); // 유지
  });

  it('task.listId를 새 list id로 매핑', () => {
    const r = sanitizeIds([task('t1', 'oldlist')], [list('oldlist')], newId);
    expect(r.lists[0].id).not.toBe('oldlist');
    expect(isUuid(r.lists[0].id)).toBe(true);
    expect(r.tasks[0].listId).toBe(r.lists[0].id); // 참조가 새 id로
  });

  it('매핑 없는 비-UUID listId는 제거(고아 참조 방지)', () => {
    const r = sanitizeIds([task('t1', 'ghost')], [], newId);
    expect(r.tasks[0].listId).toBeUndefined();
  });
});
