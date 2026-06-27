import type { SupabaseClient } from '@supabase/supabase-js';
import { NewTaskInput, Priority, RepeatRule, Subtask, Task } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { generateId } from '../utils/id';
import { buildNewList, buildNewTask, nextOccurrence, TaskRepository } from './taskRepository';

/** epoch ms ↔ timestamptz(ISO) 변환 (유효하지 않은 값은 null — toISOString 예외 방지) */
const toIso = (ms?: number) => (ms != null && Number.isFinite(ms) ? new Date(ms).toISOString() : null);
const toMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : undefined);

interface TodoRow {
  id: string;
  title: string;
  memo: string | null;
  due_date: string | null;
  completed: boolean;
  sort_order: number;
  list_id: string | null;
  priority: string | null;
  repeat: string | null;
  reminder_at: string | null;
  subtasks: Subtask[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
interface ListRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
}

function rowToTask(r: TodoRow): Task {
  return {
    id: r.id,
    title: r.title,
    memo: r.memo ?? undefined,
    dueDate: toMs(r.due_date),
    completed: r.completed,
    createdAt: toMs(r.created_at) ?? Date.now(),
    sortOrder: r.sort_order,
    listId: r.list_id ?? undefined,
    priority: (r.priority as Priority | null) ?? undefined,
    repeat: (r.repeat as RepeatRule | null) ?? undefined,
    reminderAt: toMs(r.reminder_at),
    subtasks: Array.isArray(r.subtasks) ? r.subtasks : [],
    updatedAt: toMs(r.updated_at) ?? Date.now(),
    deletedAt: toMs(r.deleted_at),
    dirty: false,
    notificationId: undefined, // 알림 id는 기기-로컬 개념(클라우드 미저장)
  };
}

/**
 * Supabase(todos/lists) 기반 저장소 — 로그인 사용자에 데이터를 묶는다.
 * 모든 쿼리는 user_id 스코프 + 서버 RLS가 추가로 강제(다른 사용자 데이터 차단).
 * 오류는 throw → 화면에서 안내(데이터 깨짐 없음: 행은 들어가거나 안 들어가거나).
 */
export class SupabaseTaskRepository implements TaskRepository {
  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string
  ) {}

  async init(): Promise<void> {
    // 스키마는 서버에서 관리(SQL). 클라이언트 준비 작업 없음.
  }

  private taskInsert(task: Task) {
    return {
      id: task.id,
      user_id: this.userId,
      title: task.title,
      memo: task.memo ?? null,
      due_date: toIso(task.dueDate),
      completed: task.completed,
      sort_order: task.sortOrder,
      list_id: task.listId ?? null,
      priority: task.priority ?? null,
      repeat: task.repeat ?? null,
      reminder_at: toIso(task.reminderAt),
      subtasks: task.subtasks ?? [],
    };
  }

  async getAll(): Promise<Task[]> {
    const { data, error } = await this.db
      .from('todos')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data as TodoRow[]).map(rowToTask);
  }

  private async nextSortOrder(): Promise<number> {
    const { data } = await this.db
      .from('todos')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    return ((data?.sort_order as number) ?? -1) + 1;
  }

  async add(input: NewTaskInput): Promise<Task> {
    if (!input.title.trim()) throw new Error('제목은 필수입니다.');
    const task = buildNewTask(input, {
      id: generateId(),
      now: Date.now(),
      sortOrder: await this.nextSortOrder(),
    });
    const { error } = await this.db.from('todos').insert(this.taskInsert(task));
    if (error) throw error;
    return task;
  }

  /** 단일 todo 행을 부분 수정 */
  private async patch(id: string, fields: Record<string, unknown>): Promise<void> {
    const { error } = await this.db.from('todos').update(fields).eq('id', id);
    if (error) throw error;
  }

  async update(id: string, patch: Partial<Task>): Promise<void> {
    const f: Record<string, unknown> = {};
    if (patch.title !== undefined) f.title = patch.title;
    if (patch.memo !== undefined) f.memo = patch.memo ?? null;
    if (patch.dueDate !== undefined) f.due_date = toIso(patch.dueDate);
    if (patch.completed !== undefined) f.completed = patch.completed;
    if (patch.sortOrder !== undefined) f.sort_order = patch.sortOrder;
    if (Object.keys(f).length === 0) return;
    await this.patch(id, f);
  }

  async toggleComplete(id: string): Promise<void> {
    const { data, error } = await this.db.from('todos').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return;
    const task = rowToTask(data as TodoRow);
    const newCompleted = !task.completed;
    await this.patch(id, { completed: newCompleted });
    if (newCompleted && task.repeat) {
      const next = nextOccurrence(task, Date.now());
      if (next) await this.add(next); // 다음 주기 자동 생성
    }
  }

  async setDueDate(id: string, dueDate: number | undefined): Promise<void> {
    await this.patch(id, { due_date: toIso(dueDate) });
  }
  async setRepeat(id: string, repeat: RepeatRule | undefined): Promise<void> {
    await this.patch(id, { repeat: repeat ?? null });
  }
  async setReminder(id: string, reminderAt: number | undefined): Promise<void> {
    await this.patch(id, { reminder_at: toIso(reminderAt) });
  }
  async setTaskList(taskId: string, listId: string | undefined): Promise<void> {
    await this.patch(taskId, { list_id: listId ?? null });
  }
  async setPriority(id: string, priority: Priority | undefined): Promise<void> {
    await this.patch(id, { priority: priority ?? null });
  }

  private async mutateSubtasks(taskId: string, fn: (s: Subtask[]) => Subtask[]): Promise<void> {
    const { data, error } = await this.db
      .from('todos')
      .select('subtasks')
      .eq('id', taskId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    const cur = Array.isArray(data.subtasks) ? (data.subtasks as Subtask[]) : [];
    await this.patch(taskId, { subtasks: fn(cur) });
  }
  async addSubtask(taskId: string, title: string): Promise<void> {
    if (!title.trim()) return;
    await this.mutateSubtasks(taskId, (s) => [
      ...s,
      { id: generateId(), title: title.trim(), completed: false },
    ]);
  }
  async toggleSubtask(taskId: string, subtaskId: string): Promise<void> {
    await this.mutateSubtasks(taskId, (s) =>
      s.map((x) => (x.id === subtaskId ? { ...x, completed: !x.completed } : x))
    );
  }
  async removeSubtask(taskId: string, subtaskId: string): Promise<void> {
    await this.mutateSubtasks(taskId, (s) => s.filter((x) => x.id !== subtaskId));
  }

  async remove(id: string): Promise<void> {
    // 소프트 삭제(톰스톤) — 화면에서 제외
    await this.patch(id, { deleted_at: new Date().toISOString() });
  }

  // ── 마이그레이션용 일괄 가져오기(멱등 upsert, 필드 보존) ──
  async importTasks(tasks: Task[]): Promise<void> {
    if (!tasks.length) return;
    const rows = tasks.map((t) => ({
      ...this.taskInsert(t),
      created_at: toIso(t.createdAt),
      deleted_at: toIso(t.deletedAt),
    }));
    const { error } = await this.db
      .from('todos')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }

  async importLists(lists: TaskList[]): Promise<void> {
    if (!lists.length) return;
    const rows = lists.map((l) => ({
      id: l.id,
      user_id: this.userId,
      name: l.name,
      sort_order: l.sortOrder,
      created_at: toIso(l.createdAt),
      deleted_at: toIso(l.deletedAt),
    }));
    const { error } = await this.db
      .from('lists')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }

  // ── 목록(lists) ──────────────────────────────
  async getLists(): Promise<TaskList[]> {
    const { data, error } = await this.db
      .from('lists')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data as ListRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: toMs(r.created_at) ?? Date.now(),
      sortOrder: r.sort_order,
      updatedAt: toMs(r.created_at) ?? Date.now(),
      dirty: false,
      deletedAt: toMs(r.deleted_at),
    }));
  }

  async addList(name: string): Promise<TaskList> {
    if (!name.trim()) throw new Error('목록 이름은 필수입니다.');
    const { data } = await this.db
      .from('lists')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = ((data?.sort_order as number) ?? -1) + 1;
    const list = buildNewList(name, { id: generateId(), now: Date.now(), sortOrder });
    const { error } = await this.db
      .from('lists')
      .insert({ id: list.id, user_id: this.userId, name: list.name, sort_order: list.sortOrder });
    if (error) throw error;
    return list;
  }

  async renameList(id: string, name: string): Promise<void> {
    if (!name.trim()) return;
    const { error } = await this.db.from('lists').update({ name: name.trim() }).eq('id', id);
    if (error) throw error;
  }

  async removeList(id: string): Promise<void> {
    // 소속 할일은 '목록 없음'으로, 목록은 소프트 삭제
    const now = new Date().toISOString();
    const r1 = await this.db.from('todos').update({ list_id: null }).eq('list_id', id);
    if (r1.error) throw r1.error;
    const r2 = await this.db.from('lists').update({ deleted_at: now }).eq('id', id);
    if (r2.error) throw r2.error;
  }

  /** 계정 삭제용 — 본인 데이터(todos/lists) 전부 물리 삭제(RLS가 본인 행으로 제한). */
  async deleteAllData(): Promise<void> {
    const r1 = await this.db.from('todos').delete().eq('user_id', this.userId);
    if (r1.error) throw r1.error;
    const r2 = await this.db.from('lists').delete().eq('user_id', this.userId);
    if (r2.error) throw r2.error;
  }
}
