import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 로그아웃 시 비로그인 로컬 캐시(평문) 정리 — 단, 유실 방지 가드 포함.
 *
 * 대상:
 *  - 웹 localStorage의 `my-plan.tasks` / `my-plan.lists` (로컬 모드 캐시, 평문)
 *  - 해당 사용자의 마이그레이션 백업 `my-plan.migrate.backup.<userId>` (평문 할일 포함)
 *
 * ⚠️ 안전 가드: 마이그레이션 완료 플래그(`my-plan.migrated.<userId>`)가 있을 때만 정리한다.
 * 아직 클라우드로 이전되지 않은(=건너뛴) 로컬 데이터를 지워 유일본을 잃는 일을 막는다.
 * 클라우드 데이터는 Supabase에 있으므로 정리해도 영향이 없다.
 */
export async function clearLocalCacheOnLogout(userId?: string): Promise<void> {
  if (!userId) return;

  let migrated = false;
  try {
    migrated = (await AsyncStorage.getItem(`my-plan.migrated.${userId}`)) === '1';
  } catch {
    migrated = false;
  }
  if (!migrated) return; // 미이전 로컬 데이터는 보존(유실 방지)

  const ls = (globalThis as { localStorage?: Storage }).localStorage;
  if (ls) {
    ls.removeItem('my-plan.tasks');
    ls.removeItem('my-plan.lists');
  }
  try {
    await AsyncStorage.removeItem(`my-plan.migrate.backup.${userId}`);
  } catch {
    // 백업 정리는 필수가 아니므로 실패해도 무시
  }
}
