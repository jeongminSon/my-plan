import { NewTaskInput, Priority, RepeatRule, Subtask, Task, TaskUpdate } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { SyncStore } from '../sync/SyncStore';
import { generateId } from '../utils/id';
import { nextDueForRepeat } from '../utils/repeat';

/**
 * 저장소 포트(인터페이스).
 *
 * 화면(UI)은 이 인터페이스에만 의존한다. 실제 구현은
 * - SqliteTaskRepository (앱 런타임, expo-sqlite)
 * - InMemoryTaskRepository (테스트 / 폴백)
 * 둘 다 동일한 계약을 만족한다.
 *
 * getAll()은 항상 sortOrder 오름차순으로 정렬해 반환한다.
 */
export interface TaskRepository {
  /** 스키마 초기화 등 준비 작업 */
  init(): Promise<void>;
  /** 전체 할일 조회 (sortOrder 오름차순) */
  getAll(): Promise<Task[]>;
  /** 새 할일 추가 → 생성된 Task 반환 */
  add(input: NewTaskInput): Promise<Task>;
  /** 부분 수정 */
  update(id: string, patch: TaskUpdate): Promise<void>;
  /** 완료 여부 토글 */
  toggleComplete(id: string): Promise<void>;
  /** 마감일 지정/해제 (undefined = 마감 없음) */
  setDueDate(id: string, dueDate: number | undefined): Promise<void>;
  /** 반복 주기 지정/해제 (undefined = 반복 없음) */
  setRepeat(id: string, repeat: RepeatRule | undefined): Promise<void>;
  /** 알림 시각 + 예약된 알림 id 저장/해제 (undefined = 알림 없음) */
  setReminder(
    id: string,
    reminderAt: number | undefined,
    notificationId: string | undefined
  ): Promise<void>;
  /** 할일을 목록으로 이동 (undefined = 목록 없음) */
  setTaskList(taskId: string, listId: string | undefined): Promise<void>;
  /** 우선순위 지정/해제 (undefined = 없음) */
  setPriority(id: string, priority: Priority | undefined): Promise<void>;
  /** 하위 할일 추가 */
  addSubtask(taskId: string, title: string): Promise<void>;
  /** 하위 할일 완료 토글 */
  toggleSubtask(taskId: string, subtaskId: string): Promise<void>;
  /** 하위 할일 삭제 */
  removeSubtask(taskId: string, subtaskId: string): Promise<void>;
  /** 삭제 */
  remove(id: string): Promise<void>;

  // ── 목록(프로젝트) ──────────────────────────────
  /** 전체 목록 조회 (sortOrder 오름차순) */
  getLists(): Promise<TaskList[]>;
  /** 목록 추가 → 생성된 TaskList 반환 */
  addList(name: string): Promise<TaskList>;
  /** 목록 이름 변경 */
  renameList(id: string, name: string): Promise<void>;
  /** 목록 삭제 (소속 할일은 '목록 없음'으로 이동, 삭제되지 않음) */
  removeList(id: string): Promise<void>;
}

/**
 * 순수 함수: 입력값 + 주입된 의존성으로 새 Task 객체를 만든다.
 * DB/시간/난수에 직접 의존하지 않으므로 테스트가 쉽다.
 */
export function buildNewTask(
  input: NewTaskInput,
  deps: { id: string; now: number; sortOrder: number }
): Task {
  return {
    id: deps.id,
    title: input.title.trim(),
    memo: input.memo?.trim() || undefined,
    dueDate: input.dueDate,
    completed: false,
    createdAt: deps.now,
    sortOrder: deps.sortOrder,
    listId: input.listId,
    repeat: input.repeat,
    priority: input.priority,
    subtasks: [],
    // 동기화 메타 (S1)
    updatedAt: deps.now,
    dirty: true,
  };
}

/**
 * 반복 할일이 완료되었을 때 생성할 '다음 주기' 입력값을 계산한다(순수 함수).
 * 반복이 없으면 null.
 */
export function nextOccurrence(task: Task, now: number): NewTaskInput | null {
  if (!task.repeat) return null;
  return {
    title: task.title,
    memo: task.memo,
    dueDate: nextDueForRepeat(task.dueDate, task.repeat, now),
    listId: task.listId,
    repeat: task.repeat,
  };
}

/** 순수 함수: 새 목록 객체를 만든다. */
export function buildNewList(
  name: string,
  deps: { id: string; now: number; sortOrder: number }
): TaskList {
  return {
    id: deps.id,
    name: name.trim(),
    createdAt: deps.now,
    sortOrder: deps.sortOrder,
    updatedAt: deps.now,
    dirty: true,
  };
}

/** sortOrder 오름차순 정렬 비교자 (Task/TaskList 공용) */
export function bySortOrder(a: { sortOrder: number }, b: { sortOrder: number }): number {
  return a.sortOrder - b.sortOrder;
}

/**
 * 메모리 기반 구현체.
 * - 단위 테스트의 기준 구현(reference implementation)
 * - SQLite를 쓸 수 없는 환경의 폴백으로도 사용 가능
 */
export class InMemoryTaskRepository implements TaskRepository, SyncStore {
  private tasks: Task[] = [];
  private lists: TaskList[] = [];

  /** 시각/ID 소스를 주입받아 테스트에서 결정론적으로 만들 수 있다. */
  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly nextId: () => string = generateId
  ) {}

  async init(): Promise<void> {
    // 메모리 구현은 준비 작업이 없다.
  }

  /** 변경 시각/dirty 스탬프 (동기화 메타) */
  private stamp(rec: { updatedAt: number; dirty: boolean }): void {
    rec.updatedAt = this.now();
    rec.dirty = true;
  }

  async getAll(): Promise<Task[]> {
    // 톰스톤(소프트 삭제)은 화면에서 제외
    return this.tasks.filter((t) => !t.deletedAt).sort(bySortOrder);
  }

  async add(input: NewTaskInput): Promise<Task> {
    if (!input.title.trim()) {
      throw new Error('제목은 필수입니다.');
    }
    const maxOrder = this.tasks.reduce((max, t) => Math.max(max, t.sortOrder), -1);
    const task = buildNewTask(input, {
      id: this.nextId(),
      now: this.now(),
      sortOrder: maxOrder + 1,
    });
    this.tasks.push(task);
    return task;
  }

  async update(id: string, patch: TaskUpdate): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    Object.assign(task, patch);
    this.stamp(task);
  }

  async toggleComplete(id: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    const wasCompleted = task.completed;
    task.completed = !wasCompleted;
    this.stamp(task);
    // 미완료 → 완료로 바뀔 때 반복 할일이면 다음 주기를 자동 생성
    if (!wasCompleted && task.repeat) {
      const input = nextOccurrence(task, this.now());
      if (input) await this.add(input);
    }
  }

  async setDueDate(id: string, dueDate: number | undefined): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.dueDate = dueDate;
    this.stamp(task);
  }

  async setRepeat(id: string, repeat: RepeatRule | undefined): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.repeat = repeat;
    this.stamp(task);
  }

  async setReminder(
    id: string,
    reminderAt: number | undefined,
    notificationId: string | undefined
  ): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.reminderAt = reminderAt;
    task.notificationId = notificationId;
    this.stamp(task);
  }

  async setTaskList(taskId: string, listId: string | undefined): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.listId = listId;
    this.stamp(task);
  }

  async setPriority(id: string, priority: Priority | undefined): Promise<void> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.priority = priority;
    this.stamp(task);
  }

  async addSubtask(taskId: string, title: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || !title.trim()) return;
    const sub: Subtask = { id: this.nextId(), title: title.trim(), completed: false };
    task.subtasks = [...(task.subtasks ?? []), sub];
    this.stamp(task);
  }

  async toggleSubtask(taskId: string, subtaskId: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.subtasks = (task.subtasks ?? []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    this.stamp(task);
  }

  async removeSubtask(taskId: string, subtaskId: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.subtasks = (task.subtasks ?? []).filter((s) => s.id !== subtaskId);
    this.stamp(task);
  }

  async remove(id: string): Promise<void> {
    // 소프트 삭제(톰스톤): 즉시 지우지 않고 deletedAt만 표시 → 삭제도 동기화 가능
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.deletedAt = this.now();
    this.stamp(task);
  }

  async getLists(): Promise<TaskList[]> {
    return this.lists.filter((l) => !l.deletedAt).sort(bySortOrder);
  }

  async addList(name: string): Promise<TaskList> {
    if (!name.trim()) {
      throw new Error('목록 이름은 필수입니다.');
    }
    const maxOrder = this.lists.reduce((max, l) => Math.max(max, l.sortOrder), -1);
    const list = buildNewList(name, {
      id: this.nextId(),
      now: this.now(),
      sortOrder: maxOrder + 1,
    });
    this.lists.push(list);
    return list;
  }

  async renameList(id: string, name: string): Promise<void> {
    const list = this.lists.find((l) => l.id === id);
    if (!list || !name.trim()) return;
    list.name = name.trim();
    this.stamp(list);
  }

  async removeList(id: string): Promise<void> {
    const list = this.lists.find((l) => l.id === id);
    if (!list) return;
    // 목록은 소프트 삭제(톰스톤)
    list.deletedAt = this.now();
    this.stamp(list);
    // 소속 할일은 삭제하지 않고 '목록 없음'으로 이동(변경이므로 스탬프)
    this.tasks.forEach((t) => {
      if (t.listId === id) {
        t.listId = undefined;
        this.stamp(t);
      }
    });
  }

  // ── SyncStore ──────────────────────────────────
  async getAllTasksIncludingDeleted(): Promise<Task[]> {
    return this.tasks.map((t) => ({ ...t }));
  }

  async getAllListsIncludingDeleted(): Promise<TaskList[]> {
    return this.lists.map((l) => ({ ...l }));
  }

  async upsertTaskFromRemote(task: Task): Promise<void> {
    const clean = { ...task, dirty: false };
    const i = this.tasks.findIndex((t) => t.id === task.id);
    if (i >= 0) this.tasks[i] = clean;
    else this.tasks.push(clean);
  }

  async upsertListFromRemote(list: TaskList): Promise<void> {
    const clean = { ...list, dirty: false };
    const i = this.lists.findIndex((l) => l.id === list.id);
    if (i >= 0) this.lists[i] = clean;
    else this.lists.push(clean);
  }

  async markTasksSynced(ids: string[]): Promise<void> {
    const set = new Set(ids);
    this.tasks.forEach((t) => {
      if (set.has(t.id)) t.dirty = false;
    });
  }

  async markListsSynced(ids: string[]): Promise<void> {
    const set = new Set(ids);
    this.lists.forEach((l) => {
      if (set.has(l.id)) l.dirty = false;
    });
  }
}
