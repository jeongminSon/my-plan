import { Task } from '../models/Task';
import { TaskRepository } from '../data/taskRepository';
import { NotificationService } from './NotificationService';

/**
 * 알림 설정 흐름을 조율한다(부수효과 경계).
 * 순서:
 *  1) 기존 예약 알림이 있으면 취소(중복/유령 알림 방지)
 *  2) 새 알림 시각이 있으면 권한 요청 → 허용 시 1회 예약
 *  3) reminderAt + notificationId 를 저장소에 반영
 *
 * 서비스/저장소를 주입받으므로 가짜(fake)로 단위 테스트할 수 있다.
 */
export async function applyReminder(deps: {
  service: NotificationService;
  repository: Pick<TaskRepository, 'setReminder'>;
  task: Pick<Task, 'id' | 'title' | 'memo' | 'notificationId'>;
  reminderAt: number | undefined;
}): Promise<{ scheduled: boolean; permissionDenied: boolean }> {
  const { service, repository, task, reminderAt } = deps;

  // 1) 이전 예약 취소
  if (task.notificationId) {
    await service.cancel(task.notificationId);
  }

  // 2) 새 예약
  let notificationId: string | undefined;
  let permissionDenied = false;
  if (reminderAt != null) {
    const granted = await service.requestPermission();
    if (granted) {
      const id = await service.schedule({ title: task.title, body: task.memo, at: reminderAt });
      notificationId = id ?? undefined;
    } else {
      permissionDenied = true;
    }
  }

  // 3) 저장 (권한 거부 시에도 reminderAt은 기록하되 notificationId는 비움)
  await repository.setReminder(task.id, reminderAt, notificationId);

  return { scheduled: notificationId != null, permissionDenied };
}
