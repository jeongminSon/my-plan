import { NotificationService, ScheduleOptions } from './NotificationService';

/**
 * 웹 알림 서비스 — 브라우저 Notification API.
 *
 * 개인정보 원칙: 로컬 알림만 사용한다. 푸시 토큰/네트워크 전송 없음.
 *
 * 한계(정직하게): 웹은 서비스워커 없이 setTimeout으로 예약하므로
 * "탭이 열려 있는 동안"에만 동작한다(새로고침/탭 종료 시 사라짐).
 * 네이티브는 OS가 예약을 관리해 앱이 꺼져 있어도 전달된다.
 */

type NotificationCtor = {
  new (title: string, options?: { body?: string }): unknown;
  permission: 'default' | 'granted' | 'denied';
  requestPermission(): Promise<'default' | 'granted' | 'denied'>;
};

function getNotification(): NotificationCtor | undefined {
  return (globalThis as { Notification?: NotificationCtor }).Notification;
}

// 예약된 타이머 핸들 (취소용)
const timers = new Map<string, ReturnType<typeof setTimeout>>();

class WebNotificationService implements NotificationService {
  async requestPermission(): Promise<boolean> {
    const N = getNotification();
    if (!N) return false;
    if (N.permission === 'granted') return true;
    if (N.permission === 'denied') return false;
    const res = await N.requestPermission();
    return res === 'granted';
  }

  async schedule({ title, body, at }: ScheduleOptions): Promise<string | null> {
    const N = getNotification();
    if (!N || N.permission !== 'granted') return null;

    const id = `${at}-${Math.random().toString(36).slice(2, 8)}`;
    const delay = Math.max(0, at - Date.now());
    const fire = () => {
      try {
        // eslint-disable-next-line no-new
        new N(title, { body });
      } catch {
        // 알림 생성 실패는 조용히 무시
      }
      timers.delete(id);
    };
    if (delay === 0) fire();
    else timers.set(id, setTimeout(fire, delay));
    return id;
  }

  async cancel(id: string): Promise<void> {
    const handle = timers.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.delete(id);
    }
  }
}

export const notificationService: NotificationService = new WebNotificationService();
