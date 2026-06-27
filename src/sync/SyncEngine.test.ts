import { InMemoryTaskRepository } from '../data/taskRepository';
import { InMemoryRemote } from './InMemoryRemote';
import { runSync } from './SyncEngine';

/** 가짜 "기기": 로컬 저장소 + 조절 가능한 시계 + 자기 cursor */
function makeDevice(label: string, start: number) {
  const clock = { v: start };
  let idn = 0;
  const repo = new InMemoryTaskRepository(
    () => clock.v,
    () => `${label}-${idn++}`
  );
  return {
    repo,
    cursor: 0,
    tick(v: number) {
      clock.v = v;
    },
  };
}

type Device = ReturnType<typeof makeDevice>;

async function sync(d: Device, remote: InMemoryRemote) {
  const r = await runSync(d.repo, remote, d.cursor);
  d.cursor = r.cursor;
  return r;
}

describe('SyncEngine (가짜 서버, LWW)', () => {
  it('한 기기의 추가가 다른 기기에 반영된다(수용 1)', async () => {
    const remote = new InMemoryRemote();
    const A = makeDevice('A', 1000);
    const B = makeDevice('B', 5000);

    await A.repo.add({ title: '공유 할일' });
    await sync(A, remote);
    await sync(B, remote);

    expect((await B.repo.getAll()).map((t) => t.title)).toEqual(['공유 할일']);
  });

  it('충돌 시 최신 변경(updatedAt 큰 쪽)이 살아남는다(수용 2)', async () => {
    const remote = new InMemoryRemote();
    const A = makeDevice('A', 1000);
    const B = makeDevice('B', 1000);

    await A.repo.add({ title: '원본' });
    await sync(A, remote);
    await sync(B, remote);
    const id = (await A.repo.getAll())[0].id;

    // A는 t=2000에, B는 t=3000(더 최신)에 같은 할일을 수정
    A.tick(2000);
    await A.repo.update(id, { title: 'A편집' });
    B.tick(3000);
    await B.repo.update(id, { title: 'B편집' });

    await sync(A, remote); // A(2000) push
    await sync(B, remote); // B(3000) push → 서버 LWW로 3000 보존
    await sync(A, remote); // A가 다시 pull → 3000 채택

    expect((await A.repo.getAll())[0].title).toBe('B편집');
    expect((await B.repo.getAll())[0].title).toBe('B편집');
  });

  it('삭제(톰스톤)가 다른 기기로 전파된다', async () => {
    const remote = new InMemoryRemote();
    const A = makeDevice('A', 1000);
    const B = makeDevice('B', 5000);

    await A.repo.add({ title: '삭제 대상' });
    await sync(A, remote);
    await sync(B, remote);
    const id = (await B.repo.getAll())[0].id;

    A.tick(2000);
    await A.repo.remove(id);
    await sync(A, remote);
    await sync(B, remote);

    expect(await B.repo.getAll()).toHaveLength(0); // B 화면에서도 사라짐
  });

  it('오프라인에서 쌓인 변경이 복귀 시 한 번에 동기화된다', async () => {
    const remote = new InMemoryRemote();
    const A = makeDevice('A', 1000);
    const B = makeDevice('B', 5000);

    // A가 오프라인 상태로 여러 변경(중간 동기화 없음)
    await A.repo.add({ title: 'a' });
    await A.repo.add({ title: 'b' });
    await A.repo.add({ title: 'c' });

    await sync(A, remote); // 복귀 후 1회 동기화로 전부 push
    await sync(B, remote);

    expect((await B.repo.getAll()).map((t) => t.title).sort()).toEqual(['a', 'b', 'c']);
  });

  it('반복 동기화는 멱등 — 중복이 생기지 않는다(안정성/수용 3)', async () => {
    const remote = new InMemoryRemote();
    const A = makeDevice('A', 1000);
    const B = makeDevice('B', 5000);

    await A.repo.add({ title: 'x' });
    await sync(A, remote);
    await sync(B, remote);

    // 변경 없이 여러 번 더 동기화
    await sync(A, remote);
    await sync(B, remote);
    await sync(A, remote);
    await sync(B, remote);

    expect(await A.repo.getAll()).toHaveLength(1);
    expect(await B.repo.getAll()).toHaveLength(1);
  });

  it('양방향: 각 기기의 서로 다른 추가가 모두 합쳐진다', async () => {
    const remote = new InMemoryRemote();
    const A = makeDevice('A', 1000);
    const B = makeDevice('B', 2000);

    await A.repo.add({ title: 'A만의 일' });
    await B.repo.add({ title: 'B만의 일' });

    // 두 기기가 번갈아 동기화하면 양쪽 모두 둘 다 보유
    await sync(A, remote);
    await sync(B, remote);
    await sync(A, remote);

    const titlesA = (await A.repo.getAll()).map((t) => t.title).sort();
    const titlesB = (await B.repo.getAll()).map((t) => t.title).sort();
    expect(titlesA).toEqual(['A만의 일', 'B만의 일']);
    expect(titlesB).toEqual(['A만의 일', 'B만의 일']);
  });
});
