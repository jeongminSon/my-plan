import { SyncMeta } from './sync';

/**
 * 목록(프로젝트) 모델. 할일을 그룹으로 묶는다.
 */
export interface TaskList extends SyncMeta {
  /** 고유 식별자 */
  id: string;
  /** 목록 이름 */
  name: string;
  /** 생성일시 — epoch ms */
  createdAt: number;
  /** 정렬 순서 */
  sortOrder: number;
}
