import { InMemoryTaskRepository, buildNewTask, bySortOrder } from './taskRepository';

describe('buildNewTask (순수 함수)', () => {
  it('입력값과 주입된 의존성으로 Task를 만든다', () => {
    const task = buildNewTask(
      { title: '  장보기  ', memo: '  우유  ', dueDate: 1000 },
      { id: 'abc', now: 500, sortOrder: 3 }
    );
    expect(task).toEqual({
      id: 'abc',
      title: '장보기', // 공백 trim
      memo: '우유',
      dueDate: 1000,
      completed: false,
      createdAt: 500,
      sortOrder: 3,
      listId: undefined,
      repeat: undefined,
      priority: undefined,
      subtasks: [],
      updatedAt: 500, // 생성 시 createdAt과 동일
      dirty: true, // 로컬 변경 표시
    });
  });

  it('빈 메모는 undefined로 정규화한다', () => {
    const task = buildNewTask({ title: '제목', memo: '   ' }, { id: 'x', now: 0, sortOrder: 0 });
    expect(task.memo).toBeUndefined();
  });
});

describe('InMemoryTaskRepository', () => {
  // 결정론적 테스트를 위해 시각/ID를 주입한다.
  function makeRepo() {
    let n = 0;
    return new InMemoryTaskRepository(
      () => 1000 + n, // now()
      () => `id-${n++}` // nextId()
    );
  }

  it('add: 추가하면 getAll로 조회된다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: '첫 할일' });
    const all = await repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(t.id);
    expect(all[0].completed).toBe(false);
  });

  it('add: 제목이 비면 에러를 던진다', async () => {
    const repo = makeRepo();
    await expect(repo.add({ title: '   ' })).rejects.toThrow('제목은 필수');
  });

  it('add: sortOrder가 0부터 순차 증가한다', async () => {
    const repo = makeRepo();
    await repo.add({ title: 'A' });
    await repo.add({ title: 'B' });
    await repo.add({ title: 'C' });
    const all = await repo.getAll();
    expect(all.map((t) => t.sortOrder)).toEqual([0, 1, 2]);
  });

  it('getAll: 항상 sortOrder 오름차순으로 정렬된다', async () => {
    const repo = makeRepo();
    const a = await repo.add({ title: 'A' });
    const b = await repo.add({ title: 'B' });
    // B를 맨 앞으로 보냄
    await repo.update(b.id, { sortOrder: -5 });
    const all = await repo.getAll();
    expect(all.map((t) => t.id)).toEqual([b.id, a.id]);
  });

  it('toggleComplete: 완료 여부를 뒤집는다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: 'A' });
    await repo.toggleComplete(t.id);
    expect((await repo.getAll())[0].completed).toBe(true);
    await repo.toggleComplete(t.id);
    expect((await repo.getAll())[0].completed).toBe(false);
  });

  it('update: 부분 수정이 반영된다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: 'A' });
    await repo.update(t.id, { title: '수정됨', memo: '메모' });
    const got = (await repo.getAll())[0];
    expect(got.title).toBe('수정됨');
    expect(got.memo).toBe('메모');
  });

  it('setDueDate: 마감일을 지정하고 다시 해제할 수 있다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: 'A' });
    await repo.setDueDate(t.id, 12345);
    expect((await repo.getAll())[0].dueDate).toBe(12345);
    await repo.setDueDate(t.id, undefined);
    expect((await repo.getAll())[0].dueDate).toBeUndefined();
  });

  it('add: dueDate를 함께 저장할 수 있다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: 'A', dueDate: 999 });
    expect(t.dueDate).toBe(999);
  });

  it('remove: 삭제하면 조회되지 않는다', async () => {
    const repo = makeRepo();
    const a = await repo.add({ title: 'A' });
    const b = await repo.add({ title: 'B' });
    await repo.remove(a.id);
    const all = await repo.getAll();
    expect(all.map((t) => t.id)).toEqual([b.id]);
  });

  it('존재하지 않는 id 수정/삭제/토글은 조용히 무시된다', async () => {
    const repo = makeRepo();
    await expect(repo.update('none', { title: 'x' })).resolves.toBeUndefined();
    await expect(repo.toggleComplete('none')).resolves.toBeUndefined();
    await expect(repo.remove('none')).resolves.toBeUndefined();
  });
});

describe('InMemoryTaskRepository — 우선순위 & 하위 할일', () => {
  function makeRepo() {
    let n = 0;
    return new InMemoryTaskRepository(
      () => 1000 + n,
      () => `id-${n++}`
    );
  }

  it('우선순위를 지정/해제한다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: 'A' });
    await repo.setPriority(t.id, 'high');
    expect((await repo.getAll())[0].priority).toBe('high');
    await repo.setPriority(t.id, undefined);
    expect((await repo.getAll())[0].priority).toBeUndefined();
  });

  it('하위 할일 추가/토글/삭제', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: 'A' });
    await repo.addSubtask(t.id, '  1단계  ');
    await repo.addSubtask(t.id, '2단계');
    let subs = (await repo.getAll())[0].subtasks ?? [];
    expect(subs.map((s) => s.title)).toEqual(['1단계', '2단계']); // trim
    expect(subs.every((s) => !s.completed)).toBe(true);

    await repo.toggleSubtask(t.id, subs[0].id);
    subs = (await repo.getAll())[0].subtasks ?? [];
    expect(subs[0].completed).toBe(true);

    await repo.removeSubtask(t.id, subs[0].id);
    subs = (await repo.getAll())[0].subtasks ?? [];
    expect(subs.map((s) => s.title)).toEqual(['2단계']);
  });

  it('하위 할일 변경은 부모를 dirty로 표시한다(동기화 대상)', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: 'A' });
    await repo.update(t.id, {}); // no-op이지만 별개
    await repo.addSubtask(t.id, 'x');
    expect((await repo.getAll())[0].dirty).toBe(true);
  });
});

describe('InMemoryTaskRepository — 동기화 메타 (S1)', () => {
  function makeRepo() {
    let t = 1000;
    let n = 0;
    return new InMemoryTaskRepository(
      () => t++, // 호출마다 증가하는 시각
      () => `id-${n++}`
    );
  }

  it('add는 updatedAt을 설정하고 dirty=true로 표시한다', async () => {
    const repo = makeRepo();
    const task = await repo.add({ title: 'A' });
    expect(task.dirty).toBe(true);
    expect(task.updatedAt).toBe(task.createdAt); // 생성 시 동일
  });

  it('변경하면 updatedAt이 증가하고 dirty=true가 된다', async () => {
    const repo = makeRepo();
    const task = await repo.add({ title: 'A' });
    const before = (await repo.getAll())[0].updatedAt;
    await repo.setDueDate(task.id, 123);
    const after = (await repo.getAll())[0];
    expect(after.updatedAt).toBeGreaterThan(before);
    expect(after.dirty).toBe(true);
  });

  it('remove는 소프트 삭제 — 목록에서 사라진다', async () => {
    const repo = makeRepo();
    const a = await repo.add({ title: 'A' });
    await repo.add({ title: 'B' });
    await repo.remove(a.id);
    expect((await repo.getAll()).map((t) => t.title)).toEqual(['B']);
  });

  it('removeList는 목록을 소프트 삭제하고 소속 할일을 보존한다', async () => {
    const repo = makeRepo();
    const l = await repo.addList('업무');
    const t = await repo.add({ title: 'A', listId: l.id });
    await repo.removeList(l.id);
    expect(await repo.getLists()).toHaveLength(0); // 톰스톤은 숨김
    const tasks = await repo.getAll();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].listId).toBeUndefined();
    expect(tasks[0].dirty).toBe(true); // 변경됨 표시
  });
});

describe('InMemoryTaskRepository — 반복 할일', () => {
  function makeRepo() {
    let n = 0;
    return new InMemoryTaskRepository(
      () => new Date(2026, 5, 27, 10, 0, 0).getTime(),
      () => `id-${n++}`
    );
  }

  it('반복 할일을 완료하면 다음 주기 할일이 자동 생성된다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: '약 먹기' });
    await repo.setRepeat(t.id, 'daily');
    await repo.toggleComplete(t.id);

    const all = await repo.getAll();
    expect(all).toHaveLength(2); // 원본(완료) + 다음 주기(미완료)
    const original = all.find((x) => x.id === t.id)!;
    const spawned = all.find((x) => x.id !== t.id)!;
    expect(original.completed).toBe(true);
    expect(spawned.completed).toBe(false);
    expect(spawned.title).toBe('약 먹기');
    expect(spawned.repeat).toBe('daily'); // 반복성 유지
    expect(spawned.dueDate).toBeDefined(); // 다음 마감일 지정됨
  });

  it('반복이 없으면 완료해도 새 할일이 생기지 않는다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: '단발성' });
    await repo.toggleComplete(t.id);
    expect(await repo.getAll()).toHaveLength(1);
  });

  it('완료를 해제(재토글)할 때는 새로 생성되지 않는다', async () => {
    const repo = makeRepo();
    const t = await repo.add({ title: '약 먹기', repeat: 'daily' });
    await repo.toggleComplete(t.id); // 완료 → 1개 생성 (총 2)
    await repo.toggleComplete(t.id); // 완료 해제 → 생성 없음
    expect(await repo.getAll()).toHaveLength(2);
  });
});

describe('InMemoryTaskRepository — 목록(프로젝트)', () => {
  function makeRepo() {
    let n = 0;
    return new InMemoryTaskRepository(
      () => 1000 + n,
      () => `id-${n++}`
    );
  }

  it('목록 추가/조회', async () => {
    const repo = makeRepo();
    const l = await repo.addList('업무');
    const lists = await repo.getLists();
    expect(lists).toHaveLength(1);
    expect(lists[0].name).toBe('업무');
    expect(lists[0].id).toBe(l.id);
  });

  it('목록 이름 변경', async () => {
    const repo = makeRepo();
    const l = await repo.addList('업무');
    await repo.renameList(l.id, '개인');
    expect((await repo.getLists())[0].name).toBe('개인');
  });

  it('할일을 목록으로 이동', async () => {
    const repo = makeRepo();
    const l = await repo.addList('업무');
    const t = await repo.add({ title: 'A' });
    await repo.setTaskList(t.id, l.id);
    expect((await repo.getAll())[0].listId).toBe(l.id);
    await repo.setTaskList(t.id, undefined);
    expect((await repo.getAll())[0].listId).toBeUndefined();
  });

  it('add 시 listId를 함께 지정할 수 있다', async () => {
    const repo = makeRepo();
    const l = await repo.addList('업무');
    const t = await repo.add({ title: 'A', listId: l.id });
    expect(t.listId).toBe(l.id);
  });

  it('목록 삭제 시 소속 할일은 지워지지 않고 목록만 해제된다', async () => {
    const repo = makeRepo();
    const l = await repo.addList('업무');
    const t = await repo.add({ title: 'A', listId: l.id });
    await repo.removeList(l.id);
    expect(await repo.getLists()).toHaveLength(0);
    const tasks = await repo.getAll();
    expect(tasks).toHaveLength(1); // 할일은 보존
    expect(tasks[0].listId).toBeUndefined(); // 목록만 해제
  });
});

describe('bySortOrder', () => {
  it('오름차순 비교자', () => {
    const arr = [{ sortOrder: 3 }, { sortOrder: 1 }, { sortOrder: 2 }] as any[];
    expect(arr.sort(bySortOrder).map((t) => t.sortOrder)).toEqual([1, 2, 3]);
  });
});
