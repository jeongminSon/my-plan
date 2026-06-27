import * as SQLite from 'expo-sqlite';
import { NewTaskInput, Priority, RepeatRule, Subtask, Task, TaskUpdate } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { buildNewList, buildNewTask, nextOccurrence, TaskRepository } from './taskRepository';
import { SyncStore } from '../sync/SyncStore';
import { generateId } from '../utils/id';

const DB_NAME = 'tasks.db';

/** DB의 한 행 형태 (SQLite는 boolean이 없어 completed를 0/1로 저장한다). */
interface TaskRow {
  id: string;
  title: string;
  memo: string | null;
  dueDate: number | null;
  completed: number;
  createdAt: number;
  sortOrder: number;
  listId: string | null;
  repeat: string | null;
  reminderAt: number | null;
  notificationId: string | null;
  updatedAt: number | null;
  deletedAt: number | null;
  dirty: number | null;
  priority: string | null;
  subtasks: string | null;
}

interface ListRow {
  id: string;
  name: string;
  createdAt: number;
  sortOrder: number;
  updatedAt: number | null;
  deletedAt: number | null;
  dirty: number | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    memo: row.memo ?? undefined,
    dueDate: row.dueDate ?? undefined,
    completed: row.completed === 1,
    createdAt: row.createdAt,
    sortOrder: row.sortOrder,
    listId: row.listId ?? undefined,
    repeat: (row.repeat as RepeatRule | null) ?? undefined,
    reminderAt: row.reminderAt ?? undefined,
    notificationId: row.notificationId ?? undefined,
    updatedAt: row.updatedAt ?? row.createdAt,
    deletedAt: row.deletedAt ?? undefined,
    dirty: row.dirty === 1,
    priority: (row.priority as Priority | null) ?? undefined,
    subtasks: parseSubtasks(row.subtasks),
  };
}

function parseSubtasks(raw: string | null): Subtask[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Subtask[]) : [];
  } catch {
    return [];
  }
}

function rowToList(row: ListRow): TaskList {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt ?? row.createdAt,
    deletedAt: row.deletedAt ?? undefined,
    dirty: row.dirty === 1,
  };
}

/**
 * expo-sqlite 기반 저장소 구현체.
 * InMemoryTaskRepository 와 동일한 TaskRepository 계약을 만족한다.
 */
export class SqliteTaskRepository implements TaskRepository, SyncStore {
  private db: SQLite.SQLiteDatabase | null = null;

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
    }
    return this.db;
  }

  /**
   * 없는 컬럼만 추가하는 안전한 마이그레이션.
   * 기존 데이터를 보존하며 스키마를 점진적으로 확장한다.
   */
  private async ensureColumn(
    db: SQLite.SQLiteDatabase,
    table: string,
    column: string,
    decl: string
  ): Promise<void> {
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
    }
  }

  async init(): Promise<void> {
    const db = await this.getDb();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS tasks (
        id        TEXT PRIMARY KEY NOT NULL,
        title     TEXT NOT NULL,
        memo      TEXT,
        dueDate   INTEGER,
        completed INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL,
        sortOrder INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lists (
        id        TEXT PRIMARY KEY NOT NULL,
        name      TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        sortOrder INTEGER NOT NULL
      );
    `);
    // 기존 tasks 테이블에 새 컬럼 추가(누락 시에만)
    await this.ensureColumn(db, 'tasks', 'listId', 'TEXT');
    await this.ensureColumn(db, 'tasks', 'repeat', 'TEXT');
    await this.ensureColumn(db, 'tasks', 'reminderAt', 'INTEGER');
    await this.ensureColumn(db, 'tasks', 'notificationId', 'TEXT');
    await this.ensureColumn(db, 'tasks', 'priority', 'TEXT');
    await this.ensureColumn(db, 'tasks', 'subtasks', 'TEXT');
    // 동기화 메타 (S1) — tasks/lists 양쪽
    for (const table of ['tasks', 'lists']) {
      await this.ensureColumn(db, table, 'updatedAt', 'INTEGER');
      await this.ensureColumn(db, table, 'deletedAt', 'INTEGER');
      await this.ensureColumn(db, table, 'dirty', 'INTEGER');
      // 기존 행 백필: updatedAt 없으면 createdAt, dirty 없으면 1(서버 미반영으로 간주)
      await db.execAsync(
        `UPDATE ${table} SET updatedAt = createdAt WHERE updatedAt IS NULL;
         UPDATE ${table} SET dirty = 1 WHERE dirty IS NULL;`
      );
    }
  }

  async getAll(): Promise<Task[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<TaskRow>(
      'SELECT * FROM tasks WHERE deletedAt IS NULL ORDER BY sortOrder ASC'
    );
    return rows.map(rowToTask);
  }

  async add(input: NewTaskInput): Promise<Task> {
    if (!input.title.trim()) {
      throw new Error('제목은 필수입니다.');
    }
    const db = await this.getDb();
    const maxRow = await db.getFirstAsync<{ maxOrder: number | null }>(
      'SELECT MAX(sortOrder) AS maxOrder FROM tasks'
    );
    const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
    const task = buildNewTask(input, { id: generateId(), now: Date.now(), sortOrder });

    await db.runAsync(
      'INSERT INTO tasks (id, title, memo, dueDate, completed, createdAt, sortOrder, listId, repeat, updatedAt, dirty, priority, subtasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
      task.id,
      task.title,
      task.memo ?? null,
      task.dueDate ?? null,
      task.completed ? 1 : 0,
      task.createdAt,
      task.sortOrder,
      task.listId ?? null,
      task.repeat ?? null,
      task.updatedAt,
      task.priority ?? null,
      JSON.stringify(task.subtasks ?? [])
    );
    return task;
  }

  async update(id: string, patch: TaskUpdate): Promise<void> {
    const db = await this.getDb();
    const fields: string[] = [];
    const values: SQLite.SQLiteBindValue[] = [];

    if (patch.title !== undefined) {
      fields.push('title = ?');
      values.push(patch.title);
    }
    if (patch.memo !== undefined) {
      fields.push('memo = ?');
      values.push(patch.memo ?? null);
    }
    if (patch.dueDate !== undefined) {
      fields.push('dueDate = ?');
      values.push(patch.dueDate ?? null);
    }
    if (patch.completed !== undefined) {
      fields.push('completed = ?');
      values.push(patch.completed ? 1 : 0);
    }
    if (patch.sortOrder !== undefined) {
      fields.push('sortOrder = ?');
      values.push(patch.sortOrder);
    }
    if (fields.length === 0) return;
    // 동기화 메타 스탬프
    fields.push('updatedAt = ?', 'dirty = 1');
    values.push(Date.now());

    values.push(id);
    await db.runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async toggleComplete(id: string): Promise<void> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
    if (!row) return;
    const task = rowToTask(row);
    const newCompleted = !task.completed;
    await db.runAsync(
      'UPDATE tasks SET completed = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      newCompleted ? 1 : 0,
      Date.now(),
      id
    );
    // 미완료 → 완료로 바뀔 때 반복 할일이면 다음 주기를 자동 생성
    if (newCompleted && task.repeat) {
      const input = nextOccurrence(task, Date.now());
      if (input) await this.add(input);
    }
  }

  async setDueDate(id: string, dueDate: number | undefined): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE tasks SET dueDate = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      dueDate ?? null,
      Date.now(),
      id
    );
  }

  async setRepeat(id: string, repeat: RepeatRule | undefined): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE tasks SET repeat = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      repeat ?? null,
      Date.now(),
      id
    );
  }

  async setReminder(
    id: string,
    reminderAt: number | undefined,
    notificationId: string | undefined
  ): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE tasks SET reminderAt = ?, notificationId = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      reminderAt ?? null,
      notificationId ?? null,
      Date.now(),
      id
    );
  }

  async setTaskList(taskId: string, listId: string | undefined): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE tasks SET listId = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      listId ?? null,
      Date.now(),
      taskId
    );
  }

  async setPriority(id: string, priority: Priority | undefined): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE tasks SET priority = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      priority ?? null,
      Date.now(),
      id
    );
  }

  /** 하위 할일 배열을 읽어 변형 후 JSON으로 다시 저장(부모 스탬프). */
  private async mutateSubtasks(
    taskId: string,
    fn: (subs: Subtask[]) => Subtask[]
  ): Promise<void> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', taskId);
    if (!row) return;
    const next = fn(parseSubtasks(row.subtasks));
    await db.runAsync(
      'UPDATE tasks SET subtasks = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      JSON.stringify(next),
      Date.now(),
      taskId
    );
  }

  async addSubtask(taskId: string, title: string): Promise<void> {
    if (!title.trim()) return;
    await this.mutateSubtasks(taskId, (subs) => [
      ...subs,
      { id: generateId(), title: title.trim(), completed: false },
    ]);
  }

  async toggleSubtask(taskId: string, subtaskId: string): Promise<void> {
    await this.mutateSubtasks(taskId, (subs) =>
      subs.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s))
    );
  }

  async removeSubtask(taskId: string, subtaskId: string): Promise<void> {
    await this.mutateSubtasks(taskId, (subs) => subs.filter((s) => s.id !== subtaskId));
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb();
    // 소프트 삭제(톰스톤)
    const now = Date.now();
    await db.runAsync(
      'UPDATE tasks SET deletedAt = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      now,
      now,
      id
    );
  }

  async getLists(): Promise<TaskList[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<ListRow>(
      'SELECT * FROM lists WHERE deletedAt IS NULL ORDER BY sortOrder ASC'
    );
    return rows.map(rowToList);
  }

  async addList(name: string): Promise<TaskList> {
    if (!name.trim()) {
      throw new Error('목록 이름은 필수입니다.');
    }
    const db = await this.getDb();
    const maxRow = await db.getFirstAsync<{ maxOrder: number | null }>(
      'SELECT MAX(sortOrder) AS maxOrder FROM lists'
    );
    const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
    const list = buildNewList(name, { id: generateId(), now: Date.now(), sortOrder });
    await db.runAsync(
      'INSERT INTO lists (id, name, createdAt, sortOrder, updatedAt, dirty) VALUES (?, ?, ?, ?, ?, 1)',
      list.id,
      list.name,
      list.createdAt,
      list.sortOrder,
      list.updatedAt
    );
    return list;
  }

  async renameList(id: string, name: string): Promise<void> {
    if (!name.trim()) return;
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE lists SET name = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      name.trim(),
      Date.now(),
      id
    );
  }

  async removeList(id: string): Promise<void> {
    const db = await this.getDb();
    const now = Date.now();
    // 소속 할일은 삭제하지 않고 '목록 없음'으로 이동 (변경이므로 스탬프)
    await db.runAsync(
      'UPDATE tasks SET listId = NULL, updatedAt = ?, dirty = 1 WHERE listId = ?',
      now,
      id
    );
    // 목록은 소프트 삭제(톰스톤)
    await db.runAsync(
      'UPDATE lists SET deletedAt = ?, updatedAt = ?, dirty = 1 WHERE id = ?',
      now,
      now,
      id
    );
  }

  // ── SyncStore ──────────────────────────────────
  async getAllTasksIncludingDeleted(): Promise<Task[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks');
    return rows.map(rowToTask);
  }

  async getAllListsIncludingDeleted(): Promise<TaskList[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<ListRow>('SELECT * FROM lists');
    return rows.map(rowToList);
  }

  async upsertTaskFromRemote(task: Task): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO tasks
       (id, title, memo, dueDate, completed, createdAt, sortOrder, listId, repeat, reminderAt, notificationId, priority, subtasks, updatedAt, deletedAt, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      task.id,
      task.title,
      task.memo ?? null,
      task.dueDate ?? null,
      task.completed ? 1 : 0,
      task.createdAt,
      task.sortOrder,
      task.listId ?? null,
      task.repeat ?? null,
      task.reminderAt ?? null,
      task.notificationId ?? null,
      task.priority ?? null,
      JSON.stringify(task.subtasks ?? []),
      task.updatedAt,
      task.deletedAt ?? null
    );
  }

  async upsertListFromRemote(list: TaskList): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO lists (id, name, createdAt, sortOrder, updatedAt, deletedAt, dirty)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      list.id,
      list.name,
      list.createdAt,
      list.sortOrder,
      list.updatedAt,
      list.deletedAt ?? null
    );
  }

  async markTasksSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await this.getDb();
    const placeholders = ids.map(() => '?').join(', ');
    await db.runAsync(`UPDATE tasks SET dirty = 0 WHERE id IN (${placeholders})`, ...ids);
  }

  async markListsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await this.getDb();
    const placeholders = ids.map(() => '?').join(', ');
    await db.runAsync(`UPDATE lists SET dirty = 0 WHERE id IN (${placeholders})`, ...ids);
  }
}

/** 앱 전역에서 공유하는 단일 저장소 인스턴스 (동기화 기능 포함) */
export const taskRepository: TaskRepository & SyncStore = new SqliteTaskRepository();
