import { Task } from '../models/Task';
import { migrateLocalToCloud, MigrationDeps } from './migrateLocalToCloud';

function task(id: string): Task {
  return {
    id,
    title: id,
    completed: false,
    createdAt: 0,
    sortOrder: 0,
    updatedAt: 0,
    dirty: false,
    subtasks: [],
  };
}

/** 추적 가능한 가짜 의존성 */
function makeDeps(over: Partial<MigrationDeps> & { localTasks?: Task[] } = {}) {
  const calls = {
    backup: 0,
    import: 0,
    setMigrated: 0,
    clear: 0,
  };
  let migrated = false;
  const localTasks = over.localTasks ?? [];
  const deps: MigrationDeps = {
    isMigrated: async () => migrated,
    readLocal: async () => ({ tasks: localTasks, lists: [] }),
    backupLocal: async () => {
      calls.backup += 1;
    },
    importToCloud: over.importToCloud ?? (async () => { calls.import += 1; }),
    verifyCloud: over.verifyCloud ?? (async () => true),
    setMigrated: async () => {
      calls.setMigrated += 1;
      migrated = true;
    },
    clearLocal: async () => {
      calls.clear += 1;
    },
  };
  return { deps, calls };
}

describe('migrateLocalToCloud', () => {
  it('이미 이전된 사용자는 건너뛴다(중복 방지)', async () => {
    const { deps, calls } = makeDeps({ localTasks: [task('a')] });
    await deps.setMigrated();
    const r = await migrateLocalToCloud(deps);
    expect(r.status).toBe('skipped');
    expect(calls.import).toBe(0);
    expect(calls.clear).toBe(0);
  });

  it('로컬 0건이면 업로드 없이 플래그만 세팅', async () => {
    const { deps, calls } = makeDeps({ localTasks: [] });
    const r = await migrateLocalToCloud(deps);
    expect(r.status).toBe('empty');
    expect(calls.import).toBe(0);
    expect(calls.setMigrated).toBe(1);
    expect(calls.clear).toBe(0);
  });

  it('정상: 백업→업로드→검증→플래그→정리 순서로 진행', async () => {
    const { deps, calls } = makeDeps({ localTasks: [task('a'), task('b')] });
    const r = await migrateLocalToCloud(deps);
    expect(r.status).toBe('migrated');
    expect(r.count).toBe(2);
    expect(calls.backup).toBe(1);
    expect(calls.import).toBe(1);
    expect(calls.setMigrated).toBe(1);
    expect(calls.clear).toBe(1);
  });

  it('대량(1000건)도 처리', async () => {
    const many = Array.from({ length: 1000 }, (_, i) => task(`t${i}`));
    const { deps } = makeDeps({ localTasks: many });
    const r = await migrateLocalToCloud(deps);
    expect(r.status).toBe('migrated');
    expect(r.count).toBe(1000);
  });

  it('업로드 실패 시: 로컬 정리하지 않고 플래그도 안 세움(재시도 안전)', async () => {
    const { deps, calls } = makeDeps({
      localTasks: [task('a')],
      importToCloud: async () => {
        throw new Error('network');
      },
    });
    await expect(migrateLocalToCloud(deps)).rejects.toThrow('network');
    expect(calls.backup).toBe(1); // 백업은 먼저 됨
    expect(calls.clear).toBe(0); // 로컬 보존
    expect(calls.setMigrated).toBe(0); // 플래그 미설정 → 다음에 재시도
  });

  it('검증 실패 시: 로컬 정리/플래그 없이 failed', async () => {
    const { deps, calls } = makeDeps({
      localTasks: [task('a')],
      verifyCloud: async () => false,
    });
    const r = await migrateLocalToCloud(deps);
    expect(r.status).toBe('failed');
    expect(calls.clear).toBe(0);
    expect(calls.setMigrated).toBe(0);
  });
});
