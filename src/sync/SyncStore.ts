import { Task } from '../models/Task';
import { TaskList } from '../models/TaskList';

/**
 * 동기화용 저장소 기능(포트).
 *
 * 일반 TaskRepository는 톰스톤(삭제됨)을 숨기고 dirty 같은 동기화 내부 상태를 노출하지 않는다.
 * SyncEngine은 그것들이 필요하므로 별도 인터페이스로 분리한다.
 * 세 저장소 구현(InMemory/Sqlite/LocalStorage)이 모두 이 인터페이스도 만족한다.
 */
export interface SyncStore {
  /** 톰스톤 포함 전체 할일 (LWW 비교 + 미반영 변경 탐지용) */
  getAllTasksIncludingDeleted(): Promise<Task[]>;
  /** 톰스톤 포함 전체 목록 */
  getAllListsIncludingDeleted(): Promise<TaskList[]>;
  /** 원격 레코드를 그대로 반영(upsert, dirty=false) */
  upsertTaskFromRemote(task: Task): Promise<void>;
  upsertListFromRemote(list: TaskList): Promise<void>;
  /** 서버에 보낸 레코드를 동기화 완료(dirty=false)로 표시 */
  markTasksSynced(ids: string[]): Promise<void>;
  markListsSynced(ids: string[]): Promise<void>;
}
