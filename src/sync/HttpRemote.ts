import { Task } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { PullResult, RemoteApi } from './RemoteApi';

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * 인증 방식:
 *  - { key }    : 익명 동기화 코드(헤더 x-sync-key)
 *  - { bearer } : 구글 id_token(헤더 Authorization: Bearer) — 서버가 검증
 */
export type RemoteAuth = { key: string } | { bearer: string };

/**
 * HTTP 기반 원격 구현 — Netlify Function 동기화 서버와 통신한다.
 * - 전송은 HTTPS(TLS)로 이뤄진다(Netlify 기본).
 * - fetch를 주입받아 단위 테스트가 가능하다.
 */
export class HttpRemote implements RemoteApi {
  constructor(
    private readonly baseUrl: string,
    private readonly auth: RemoteAuth,
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init)
  ) {}

  private authHeaders(): Record<string, string> {
    return 'bearer' in this.auth
      ? { Authorization: `Bearer ${this.auth.bearer}` }
      : { 'x-sync-key': this.auth.key };
  }

  async push(tasks: Task[], lists: TaskList[]): Promise<void> {
    if (tasks.length === 0 && lists.length === 0) return;
    const res = await this.fetchFn(this.baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ tasks, lists }),
    });
    if (!res.ok) throw new Error(`동기화 push 실패: HTTP ${res.status}`);
  }

  async pull(since: number): Promise<PullResult> {
    const url = `${this.baseUrl}?since=${since}`;
    const res = await this.fetchFn(url, { method: 'GET', headers: this.authHeaders() });
    if (!res.ok) throw new Error(`동기화 pull 실패: HTTP ${res.status}`);
    const data = (await res.json()) as PullResult;
    return { tasks: data.tasks ?? [], lists: data.lists ?? [], cursor: data.cursor ?? since };
  }
}
