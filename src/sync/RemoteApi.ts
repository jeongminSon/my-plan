import { Task } from '../models/Task';
import { TaskList } from '../models/TaskList';

/**
 * 원격(서버) 포트.
 *
 * 화면/엔진은 이 인터페이스에만 의존한다. 실제 구현은:
 *  - InMemoryRemote (테스트용 가짜 서버 — S2)
 *  - (이후) SupabaseRemote (S3, 실제 백엔드)
 *
 * cursor는 서버가 부여하는 단조 증가 시퀀스다(클라이언트 시계와 무관).
 */
export interface PullResult {
  tasks: Task[];
  lists: TaskList[];
  cursor: number;
}

export interface RemoteApi {
  /** 로컬의 변경분(dirty)을 서버로 보낸다. 서버도 LWW로 최신만 보존한다. */
  push(tasks: Task[], lists: TaskList[]): Promise<void>;
  /** cursor 이후 변경된 레코드와 새 cursor를 받는다. */
  pull(since: number): Promise<PullResult>;
}
