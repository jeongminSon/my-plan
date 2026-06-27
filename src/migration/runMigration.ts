import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseTaskRepository } from '../data/supabaseRepository';
import { TaskRepository } from '../data/taskRepository';
import { migrateLocalToCloud, MigrationResult } from './migrateLocalToCloud';

/**
 * 실제 마이그레이션 실행 (오케스트레이터에 실 의존성 주입).
 * - 플래그/백업: AsyncStorage(사용자별 키) → 중복 방지 + 원본 백업 보존
 * - 검증: 클라우드 getAll로 업로드된 id 전부 존재 확인
 * - 로컬 정리: 웹 localStorage 키만 비움(백업은 AsyncStorage에 별도 보존). 네이티브는 보존(백업).
 */
export async function runMigration(
  localRepo: TaskRepository,
  cloud: SupabaseTaskRepository,
  userId: string
): Promise<MigrationResult> {
  const flagKey = `my-plan.migrated.${userId}`;
  const backupKey = `my-plan.migrate.backup.${userId}`;

  return migrateLocalToCloud({
    isMigrated: async () => (await AsyncStorage.getItem(flagKey)) === '1',
    readLocal: async () => ({
      tasks: await localRepo.getAll(),
      lists: await localRepo.getLists(),
    }),
    backupLocal: async (data) => {
      await AsyncStorage.setItem(backupKey, JSON.stringify({ savedAt: Date.now(), ...data }));
    },
    importToCloud: async ({ tasks, lists }) => {
      await cloud.importLists(lists); // 목록 먼저(외래 참조 순서)
      await cloud.importTasks(tasks);
    },
    verifyCloud: async (ids) => {
      const all = await cloud.getAll();
      const present = new Set(all.map((t) => t.id));
      return ids.every((id) => present.has(id));
    },
    setMigrated: async () => {
      await AsyncStorage.setItem(flagKey, '1');
    },
    clearLocal: async () => {
      const ls = (globalThis as { localStorage?: Storage }).localStorage;
      if (ls) {
        ls.removeItem('my-plan.tasks');
        ls.removeItem('my-plan.lists');
      }
      // 네이티브(SQLite)는 백업 목적상 보존(앱은 이후 클라우드만 읽음)
    },
  });
}
