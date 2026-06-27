import { HttpRemote } from './HttpRemote';
import { runSync } from './SyncEngine';
import { syncBaseUrl } from './syncConfig';
import { SyncStore } from './SyncStore';
import { getCursor, getOrCreateUserKey, setCursor } from './syncSettings';

export interface SyncOutcome {
  pushed: number;
  pulled: number;
}

/**
 * 한 번의 동기화 실행(앱↔서버).
 * 로컬 SyncStore의 변경을 서버로 보내고, 서버의 변경을 받아 LWW로 병합한다.
 */
export async function syncNow(store: SyncStore): Promise<SyncOutcome> {
  const base = syncBaseUrl();
  if (!base) {
    throw new Error('동기화 서버 주소가 없습니다. EXPO_PUBLIC_SYNC_URL을 설정하세요.');
  }
  const userKey = await getOrCreateUserKey();
  const remote = new HttpRemote(base, userKey);
  const since = await getCursor();
  const result = await runSync(store, remote, since);
  await setCursor(result.cursor);
  return { pushed: result.pushed, pulled: result.pulled };
}
