import { Task } from '../models/Task';
import { TaskList } from '../models/TaskList';

/**
 * 로컬 → 클라우드 1회성 마이그레이션 오케스트레이터 (순수 — 의존성 주입으로 테스트 가능).
 *
 * 안전 순서(유실 방지가 최우선):
 *   1) 이미 이전됨? → 건너뜀(중복 방지 플래그)
 *   2) 로컬 0건 → 플래그만 세팅(no-op)
 *   3) 백업 먼저  → 4) 업로드 → 5) 검증 → (검증 성공시에만) 6) 플래그 → 7) 로컬 정리
 *   - 업로드/검증 실패 시 로컬을 건드리지 않고 플래그도 안 세움 → 다음에 안전하게 재시도
 */
export interface MigrationDeps {
  isMigrated: () => Promise<boolean>;
  readLocal: () => Promise<{ tasks: Task[]; lists: TaskList[] }>;
  backupLocal: (data: { tasks: Task[]; lists: TaskList[] }) => Promise<void>;
  importToCloud: (data: { tasks: Task[]; lists: TaskList[] }) => Promise<void>;
  /** 업로드된 task id들이 클라우드에 실제로 존재하는지 검증 */
  verifyCloud: (taskIds: string[]) => Promise<boolean>;
  setMigrated: () => Promise<void>;
  clearLocal: () => Promise<void>;
}

export type MigrationStatus = 'skipped' | 'empty' | 'migrated' | 'failed';
export interface MigrationResult {
  status: MigrationStatus;
  count: number;
}

export async function migrateLocalToCloud(deps: MigrationDeps): Promise<MigrationResult> {
  if (await deps.isMigrated()) return { status: 'skipped', count: 0 };

  const { tasks, lists } = await deps.readLocal();
  if (tasks.length === 0 && lists.length === 0) {
    await deps.setMigrated();
    return { status: 'empty', count: 0 };
  }

  // 1) 백업 먼저 (정리 전 원본 보존)
  await deps.backupLocal({ tasks, lists });

  // 2) 업로드
  await deps.importToCloud({ tasks, lists });

  // 3) 검증 — 실패 시 로컬을 건드리지 않고 중단(안전, 재시도 가능)
  const ok = await deps.verifyCloud(tasks.map((t) => t.id));
  if (!ok) return { status: 'failed', count: 0 };

  // 4) 성공 확인 후에만 플래그 + 로컬 정리(백업은 남음)
  await deps.setMigrated();
  await deps.clearLocal();
  return { status: 'migrated', count: tasks.length };
}
