import { RemoteApi } from './RemoteApi';
import { SyncStore } from './SyncStore';

export interface SyncResult {
  /** 다음 동기화에 쓸 서버 cursor */
  cursor: number;
  pushed: number;
  pulled: number;
}

/**
 * 한 번의 동기화 사이클(오프라인 우선 + 최신변경 우선(LWW)).
 *
 * 1) 로컬 dirty 레코드를 서버로 push → 동기화 완료 표시
 * 2) cursor 이후 변경분을 pull
 * 3) LWW 병합: 원격 updatedAt이 로컬보다 크거나 같으면 원격 채택(톰스톤=삭제도 전파)
 *
 * push를 pull보다 먼저 하여 아직 못 보낸 로컬 변경이 덮이지 않게 한다.
 * 서버도 LWW를 적용하므로, 다른 기기의 더 최신 변경이 최종적으로 살아남는다.
 */
export async function runSync(
  store: SyncStore,
  remote: RemoteApi,
  since: number
): Promise<SyncResult> {
  // 스냅샷(LWW 비교 기준) — push 전에 떠 둔다
  const localTasks = await store.getAllTasksIncludingDeleted();
  const localLists = await store.getAllListsIncludingDeleted();
  const localTaskMap = new Map(localTasks.map((t) => [t.id, t]));
  const localListMap = new Map(localLists.map((l) => [l.id, l]));

  // 1) push
  const pendingTasks = localTasks.filter((t) => t.dirty);
  const pendingLists = localLists.filter((l) => l.dirty);
  await remote.push(pendingTasks, pendingLists);
  if (pendingTasks.length) await store.markTasksSynced(pendingTasks.map((t) => t.id));
  if (pendingLists.length) await store.markListsSynced(pendingLists.map((l) => l.id));

  // 2) pull
  const { tasks, lists, cursor } = await remote.pull(since);

  // 3) LWW 병합
  let pulled = 0;
  for (const r of tasks) {
    const local = localTaskMap.get(r.id);
    if (!local || r.updatedAt >= local.updatedAt) {
      await store.upsertTaskFromRemote(r);
      pulled += 1;
    }
  }
  for (const r of lists) {
    const local = localListMap.get(r.id);
    if (!local || r.updatedAt >= local.updatedAt) {
      await store.upsertListFromRemote(r);
      pulled += 1;
    }
  }

  return { cursor, pushed: pendingTasks.length + pendingLists.length, pulled };
}
