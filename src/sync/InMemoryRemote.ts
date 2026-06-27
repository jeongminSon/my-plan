import { Task } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { PullResult, RemoteApi } from './RemoteApi';

interface Entry<T> {
  rec: T;
  seq: number;
}

/**
 * 테스트용 가짜 서버(여러 "기기"가 공유). 네트워크 없음.
 * - push: 서버측 LWW로 더 최신(updatedAt)만 보존, 수락 시 서버 시퀀스 부여
 * - pull: since 시퀀스 이후 레코드 반환
 * Date.now/Math.random을 쓰지 않아 결정론적이다.
 */
export class InMemoryRemote implements RemoteApi {
  private tasks = new Map<string, Entry<Task>>();
  private lists = new Map<string, Entry<TaskList>>();
  private seq = 0;

  async push(tasks: Task[], lists: TaskList[]): Promise<void> {
    for (const t of tasks) {
      const ex = this.tasks.get(t.id);
      if (ex && ex.rec.updatedAt > t.updatedAt) continue; // 서버가 더 최신 → 거부
      this.tasks.set(t.id, { rec: { ...t, dirty: false }, seq: ++this.seq });
    }
    for (const l of lists) {
      const ex = this.lists.get(l.id);
      if (ex && ex.rec.updatedAt > l.updatedAt) continue;
      this.lists.set(l.id, { rec: { ...l, dirty: false }, seq: ++this.seq });
    }
  }

  async pull(since: number): Promise<PullResult> {
    const tasks = [...this.tasks.values()].filter((e) => e.seq > since).map((e) => ({ ...e.rec }));
    const lists = [...this.lists.values()].filter((e) => e.seq > since).map((e) => ({ ...e.rec }));
    return { tasks, lists, cursor: this.seq };
  }
}
