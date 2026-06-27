import { NewTaskInput, Priority, RepeatRule, Subtask, Task, TaskUpdate } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { buildNewList, buildNewTask, bySortOrder, nextOccurrence, TaskRepository } from './taskRepository';
import { SyncStore } from '../sync/SyncStore';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'my-plan.tasks';
const LISTS_KEY = 'my-plan.lists';

/**
 * 웹 전용 저장소 구현체.
 *
 * expo-sqlite는 웹에서 WASM 워커가 필요해 기본 번들 설정으로는 동작하지 않는다.
 * 웹에서는 브라우저 localStorage 로 영구 저장한다 (새로고침/재방문 후에도 유지).
 *
 * Metro가 플랫폼에 따라 파일을 자동 선택한다:
 *  - 웹      → db.web.ts (이 파일)
 *  - 네이티브 → db.ts (SqliteTaskRepository)
 * 따라서 expo-sqlite 는 웹 번들에 포함되지 않는다.
 */
export class LocalStorageTaskRepository implements TaskRepository, SyncStore {
  private get storage(): Storage | undefined {
    return (globalThis as { localStorage?: Storage }).localStorage;
  }

  /** 동기화 메타 스탬프 */
  private stamp(rec: { updatedAt: number; dirty: boolean }): void {
    rec.updatedAt = Date.now();
    rec.dirty = true;
  }

  private load(): Task[] {
    const raw = this.storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      // 기존 데이터(동기화 필드 없음)도 안전하게 정규화
      return (JSON.parse(raw) as Task[]).map((t) => ({
        ...t,
        updatedAt: t.updatedAt ?? t.createdAt,
        dirty: t.dirty ?? true,
        subtasks: t.subtasks ?? [],
      }));
    } catch {
      return [];
    }
  }

  private save(tasks: Task[]): void {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  private loadLists(): TaskList[] {
    const raw = this.storage?.getItem(LISTS_KEY);
    if (!raw) return [];
    try {
      return (JSON.parse(raw) as TaskList[]).map((l) => ({
        ...l,
        updatedAt: l.updatedAt ?? l.createdAt,
        dirty: l.dirty ?? true,
      }));
    } catch {
      return [];
    }
  }

  private saveLists(lists: TaskList[]): void {
    this.storage?.setItem(LISTS_KEY, JSON.stringify(lists));
  }

  async init(): Promise<void> {
    // localStorage는 준비 작업이 없다.
  }

  async getAll(): Promise<Task[]> {
    return this.load()
      .filter((t) => !t.deletedAt)
      .sort(bySortOrder);
  }

  async add(input: NewTaskInput): Promise<Task> {
    if (!input.title.trim()) {
      throw new Error('제목은 필수입니다.');
    }
    const tasks = this.load();
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.sortOrder), -1);
    const task = buildNewTask(input, {
      id: generateId(),
      now: Date.now(),
      sortOrder: maxOrder + 1,
    });
    tasks.push(task);
    this.save(tasks);
    return task;
  }

  async update(id: string, patch: TaskUpdate): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    Object.assign(task, patch);
    this.stamp(task);
    this.save(tasks);
  }

  async toggleComplete(id: string): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const wasCompleted = task.completed;
    task.completed = !wasCompleted;
    this.stamp(task);
    this.save(tasks);
    // 미완료 → 완료로 바뀔 때 반복 할일이면 다음 주기를 자동 생성
    if (!wasCompleted && task.repeat) {
      const input = nextOccurrence(task, Date.now());
      if (input) await this.add(input);
    }
  }

  async setDueDate(id: string, dueDate: number | undefined): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.dueDate = dueDate;
    this.stamp(task);
    this.save(tasks);
  }

  async setRepeat(id: string, repeat: RepeatRule | undefined): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.repeat = repeat;
    this.stamp(task);
    this.save(tasks);
  }

  async setReminder(
    id: string,
    reminderAt: number | undefined,
    notificationId: string | undefined
  ): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.reminderAt = reminderAt;
    task.notificationId = notificationId;
    this.stamp(task);
    this.save(tasks);
  }

  async setTaskList(taskId: string, listId: string | undefined): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.listId = listId;
    this.stamp(task);
    this.save(tasks);
  }

  async setPriority(id: string, priority: Priority | undefined): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.priority = priority;
    this.stamp(task);
    this.save(tasks);
  }

  async addSubtask(taskId: string, title: string): Promise<void> {
    if (!title.trim()) return;
    const tasks = this.load();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const sub: Subtask = { id: generateId(), title: title.trim(), completed: false };
    task.subtasks = [...(task.subtasks ?? []), sub];
    this.stamp(task);
    this.save(tasks);
  }

  async toggleSubtask(taskId: string, subtaskId: string): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.subtasks = (task.subtasks ?? []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    this.stamp(task);
    this.save(tasks);
  }

  async removeSubtask(taskId: string, subtaskId: string): Promise<void> {
    const tasks = this.load();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.subtasks = (task.subtasks ?? []).filter((s) => s.id !== subtaskId);
    this.stamp(task);
    this.save(tasks);
  }

  async remove(id: string): Promise<void> {
    // 소프트 삭제(톰스톤)
    const tasks = this.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.deletedAt = Date.now();
    this.stamp(task);
    this.save(tasks);
  }

  async getLists(): Promise<TaskList[]> {
    return this.loadLists()
      .filter((l) => !l.deletedAt)
      .sort(bySortOrder);
  }

  async addList(name: string): Promise<TaskList> {
    if (!name.trim()) {
      throw new Error('목록 이름은 필수입니다.');
    }
    const lists = this.loadLists();
    const maxOrder = lists.reduce((max, l) => Math.max(max, l.sortOrder), -1);
    const list = buildNewList(name, { id: generateId(), now: Date.now(), sortOrder: maxOrder + 1 });
    lists.push(list);
    this.saveLists(lists);
    return list;
  }

  async renameList(id: string, name: string): Promise<void> {
    if (!name.trim()) return;
    const lists = this.loadLists();
    const list = lists.find((l) => l.id === id);
    if (!list) return;
    list.name = name.trim();
    this.stamp(list);
    this.saveLists(lists);
  }

  async removeList(id: string): Promise<void> {
    // 목록은 소프트 삭제(톰스톤)
    const lists = this.loadLists();
    const list = lists.find((l) => l.id === id);
    if (list) {
      list.deletedAt = Date.now();
      this.stamp(list);
      this.saveLists(lists);
    }
    // 소속 할일은 삭제하지 않고 '목록 없음'으로 이동(변경이므로 스탬프)
    const tasks = this.load();
    let changed = false;
    tasks.forEach((t) => {
      if (t.listId === id) {
        t.listId = undefined;
        this.stamp(t);
        changed = true;
      }
    });
    if (changed) this.save(tasks);
  }

  // ── SyncStore ──────────────────────────────────
  async getAllTasksIncludingDeleted(): Promise<Task[]> {
    return this.load();
  }

  async getAllListsIncludingDeleted(): Promise<TaskList[]> {
    return this.loadLists();
  }

  async upsertTaskFromRemote(task: Task): Promise<void> {
    const tasks = this.load();
    const clean = { ...task, dirty: false };
    const i = tasks.findIndex((t) => t.id === task.id);
    if (i >= 0) tasks[i] = clean;
    else tasks.push(clean);
    this.save(tasks);
  }

  async upsertListFromRemote(list: TaskList): Promise<void> {
    const lists = this.loadLists();
    const clean = { ...list, dirty: false };
    const i = lists.findIndex((l) => l.id === list.id);
    if (i >= 0) lists[i] = clean;
    else lists.push(clean);
    this.saveLists(lists);
  }

  async markTasksSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const set = new Set(ids);
    const tasks = this.load();
    tasks.forEach((t) => {
      if (set.has(t.id)) t.dirty = false;
    });
    this.save(tasks);
  }

  async markListsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const set = new Set(ids);
    const lists = this.loadLists();
    lists.forEach((l) => {
      if (set.has(l.id)) l.dirty = false;
    });
    this.saveLists(lists);
  }
}

/** 앱 전역에서 공유하는 단일 저장소 인스턴스 (웹) */
export const taskRepository: TaskRepository = new LocalStorageTaskRepository();
