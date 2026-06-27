import { isSessionValid, loadSession } from '../auth/authStore';
import { HttpRemote, RemoteAuth } from './HttpRemote';
import { runSync } from './SyncEngine';
import { syncBaseUrl } from './syncConfig';
import { SyncStore } from './SyncStore';
import { getCursor, getOrCreateUserKey, setCursor } from './syncSettings';

export interface SyncOutcome {
  pushed: number;
  pulled: number;
  identity: 'google' | 'anon';
}

/**
 * 한 번의 동기화 실행(앱↔서버).
 * - 구글 로그인 세션이 유효하면 Bearer로(계정 기준 동기화)
 * - 아니면 익명 동기화 코드로
 * 로그인 세션이 있는데 만료됐으면 재로그인을 요구한다.
 */
export async function syncNow(store: SyncStore): Promise<SyncOutcome> {
  const base = syncBaseUrl();
  if (!base) {
    throw new Error('동기화 서버 주소가 없습니다. EXPO_PUBLIC_SYNC_URL을 설정하세요.');
  }

  const session = await loadSession();
  let auth: RemoteAuth;
  let identity: 'google' | 'anon';
  if (session) {
    if (!isSessionValid(session, Date.now())) {
      throw new Error('구글 로그인이 만료됐어요. 다시 로그인해 주세요.');
    }
    auth = { bearer: session.idToken };
    identity = 'google';
  } else {
    auth = { key: await getOrCreateUserKey() };
    identity = 'anon';
  }

  const remote = new HttpRemote(base, auth);
  const since = await getCursor();
  const result = await runSync(store, remote, since);
  await setCursor(result.cursor);
  return { pushed: result.pushed, pulled: result.pulled, identity };
}
