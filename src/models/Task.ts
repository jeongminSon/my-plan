/**
 * 할일(Task) 데이터 모델
 *
 * 날짜/시간은 모두 epoch milliseconds(number)로 저장한다.
 * - SQLite에 정수로 저장 가능하고, 정렬/비교가 단순하며, 타임존 변환 부담이 없다.
 */
import { SyncMeta } from './sync';

/** 반복 주기 (undefined = 반복 없음) */
export type RepeatRule = 'daily' | 'weekly' | 'monthly';

/** 우선순위 (undefined = 없음) */
export type Priority = 'high' | 'med' | 'low';

/** 하위 할일(체크리스트 항목) */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task extends SyncMeta {
  /** 고유 식별자 (UUID) */
  id: string;
  /** 제목 (필수) */
  title: string;
  /** 메모 (선택) */
  memo?: string;
  /** 마감일 (선택) — epoch ms */
  dueDate?: number;
  /** 완료 여부 */
  completed: boolean;
  /** 생성일시 — epoch ms */
  createdAt: number;
  /** 정렬 순서 (오름차순, 작을수록 위) */
  sortOrder: number;
  /** 소속 목록 id (선택, 미지정 = 목록 없음) */
  listId?: string;
  /** 반복 주기 (선택, 미지정 = 반복 없음). 완료 시 다음 주기 할일이 자동 생성된다. */
  repeat?: RepeatRule;
  /** 알림 시각 (선택, epoch ms). 이 시각에 로컬 알림 1회. */
  reminderAt?: number;
  /** 예약된 로컬 알림 id (취소/교체용). 외부로 전송되지 않는 기기 내부 식별자다. */
  notificationId?: string;
  /** 우선순위 (선택) */
  priority?: Priority;
  /** 하위 할일 목록 (체크리스트). 없으면 빈 배열로 취급 */
  subtasks?: Subtask[];
}

/**
 * 새 할일 생성 시 입력값.
 * id/completed/createdAt/sortOrder는 저장소에서 채워주므로 제외한다.
 */
export interface NewTaskInput {
  title: string;
  memo?: string;
  dueDate?: number;
  listId?: string;
  repeat?: RepeatRule;
  priority?: Priority;
}

/**
 * 기존 할일 수정 시 변경 가능한 필드(부분 갱신).
 */
export type TaskUpdate = Partial<Pick<Task, 'title' | 'memo' | 'dueDate' | 'completed' | 'sortOrder'>>;
