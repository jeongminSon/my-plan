import { InMemoryTaskRepository } from '../data/taskRepository';
import { NotificationService, ScheduleOptions } from './NotificationService';
import { applyReminder } from './reminderCoordinator';

/** 호출을 기록하는 가짜 알림 서비스 */
class FakeNotificationService implements NotificationService {
  scheduleCalls: ScheduleOptions[] = [];
  cancelCalls: string[] = [];
  permission = true;
  private seq = 0;

  async requestPermission(): Promise<boolean> {
    return this.permission;
  }
  async schedule(opts: ScheduleOptions): Promise<string | null> {
    if (!this.permission) return null;
    this.scheduleCalls.push(opts);
    return `notif-${this.seq++}`;
  }
  async cancel(id: string): Promise<void> {
    this.cancelCalls.push(id);
  }
}

async function setup() {
  const repo = new InMemoryTaskRepository(
    () => 1000,
    (() => {
      let n = 0;
      return () => `id-${n++}`;
    })()
  );
  const task = await repo.add({ title: '약 먹기', memo: '식후' });
  return { repo, task };
}

describe('applyReminder', () => {
  it('알림 시각 설정 시 정확히 1회 예약하고 저장한다', async () => {
    const { repo, task } = await setup();
    const service = new FakeNotificationService();

    const result = await applyReminder({ service, repository: repo, task, reminderAt: 5000 });

    expect(service.scheduleCalls).toHaveLength(1); // 정확히 1회
    expect(service.scheduleCalls[0]).toEqual({ title: '약 먹기', body: '식후', at: 5000 });
    expect(result.scheduled).toBe(true);

    const saved = (await repo.getAll())[0];
    expect(saved.reminderAt).toBe(5000);
    expect(saved.notificationId).toBe('notif-0');
  });

  it('알림 시각 변경 시 이전 예약을 취소하고 새로 1회 예약한다', async () => {
    const { repo, task } = await setup();
    const service = new FakeNotificationService();

    await applyReminder({ service, repository: repo, task, reminderAt: 5000 });
    const afterFirst = (await repo.getAll())[0];

    await applyReminder({ service, repository: repo, task: afterFirst, reminderAt: 9000 });

    expect(service.cancelCalls).toEqual(['notif-0']); // 이전 알림 취소
    expect(service.scheduleCalls).toHaveLength(2); // 새 예약
    const saved = (await repo.getAll())[0];
    expect(saved.reminderAt).toBe(9000);
    expect(saved.notificationId).toBe('notif-1');
  });

  it('알림 해제 시 예약을 취소하고 새로 예약하지 않는다', async () => {
    const { repo, task } = await setup();
    const service = new FakeNotificationService();

    await applyReminder({ service, repository: repo, task, reminderAt: 5000 });
    const withReminder = (await repo.getAll())[0];

    await applyReminder({ service, repository: repo, task: withReminder, reminderAt: undefined });

    expect(service.cancelCalls).toEqual(['notif-0']);
    expect(service.scheduleCalls).toHaveLength(1); // 추가 예약 없음
    const saved = (await repo.getAll())[0];
    expect(saved.reminderAt).toBeUndefined();
    expect(saved.notificationId).toBeUndefined();
  });

  it('권한 거부 시 예약하지 않지만 시각은 저장한다', async () => {
    const { repo, task } = await setup();
    const service = new FakeNotificationService();
    service.permission = false;

    const result = await applyReminder({ service, repository: repo, task, reminderAt: 5000 });

    expect(service.scheduleCalls).toHaveLength(0);
    expect(result.permissionDenied).toBe(true);
    const saved = (await repo.getAll())[0];
    expect(saved.reminderAt).toBe(5000);
    expect(saved.notificationId).toBeUndefined();
  });
});
