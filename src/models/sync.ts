/**
 * 동기화 메타데이터.
 *
 * 모든 동기화 대상 레코드(Task/TaskList)가 공통으로 갖는다.
 * - updatedAt: 마지막 변경 시각(epoch ms) → 충돌 해결(LWW) 기준
 * - deletedAt: 소프트 삭제(톰스톤). 삭제도 동기화돼야 하므로 즉시 물리삭제하지 않는다.
 * - dirty:     로컬에서 바뀌었고 아직 서버에 반영되지 않은 변경
 *
 * S1 단계에서는 네트워크가 없으므로 dirty/updatedAt를 로컬에서 관리만 하고,
 * 이후 단계의 SyncEngine이 이 필드들을 사용한다.
 */
export interface SyncMeta {
  updatedAt: number;
  deletedAt?: number;
  dirty: boolean;
}
