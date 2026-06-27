import { Task } from '../models/Task';
import { HttpRemote } from './HttpRemote';

function task(id: string, updatedAt: number): Task {
  return {
    id,
    title: id,
    completed: false,
    createdAt: updatedAt,
    sortOrder: 0,
    updatedAt,
    dirty: true,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('HttpRemote', () => {
  it('push는 POST로 변경분과 키를 보낸다', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchFn = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ ok: true, cursor: 1 });
    };
    const remote = new HttpRemote('https://site/.netlify/functions/sync', { key: 'user-123' }, fetchFn);

    await remote.push([task('a', 100)], []);

    expect(calls).toHaveLength(1);
    expect(calls[0].init?.method).toBe('POST');
    expect((calls[0].init?.headers as Record<string, string>)['x-sync-key']).toBe('user-123');
    const body = JSON.parse(calls[0].init?.body as string);
    expect(body.tasks[0].id).toBe('a');
  });

  it('변경이 없으면 네트워크를 호출하지 않는다', async () => {
    let called = 0;
    const remote = new HttpRemote('https://x', { key: 'k' }, async () => {
      called += 1;
      return jsonResponse({});
    });
    await remote.push([], []);
    expect(called).toBe(0);
  });

  it('pull은 since를 쿼리로 보내고 결과를 파싱한다', async () => {
    let seenUrl = '';
    const fetchFn = async (url: string) => {
      seenUrl = url;
      return jsonResponse({ tasks: [task('a', 100)], lists: [], cursor: 7 });
    };
    const remote = new HttpRemote('https://site/fn', { key: 'user-123' }, fetchFn);

    const res = await remote.pull(3);
    expect(seenUrl).toContain('since=3');
    expect(res.cursor).toBe(7);
    expect(res.tasks[0].id).toBe('a');
  });

  it('HTTP 오류는 예외를 던진다', async () => {
    const remote = new HttpRemote('https://x', { key: 'k' }, async () => jsonResponse({}, false, 500));
    await expect(remote.pull(0)).rejects.toThrow('pull 실패');
  });

  it('구글 로그인 시 Authorization: Bearer 헤더를 보낸다', async () => {
    let headers: Record<string, string> = {};
    const fetchFn = async (_url: string, init?: RequestInit) => {
      headers = (init?.headers as Record<string, string>) ?? {};
      return jsonResponse({ tasks: [], lists: [], cursor: 0 });
    };
    const remote = new HttpRemote('https://x', { bearer: 'ID_TOKEN_123' }, fetchFn);
    await remote.pull(0);
    expect(headers.Authorization).toBe('Bearer ID_TOKEN_123');
    expect(headers['x-sync-key']).toBeUndefined();
  });
});
