import * as Notifications from 'expo-notifications';
import { NotificationService, ScheduleOptions } from './NotificationService';

/**
 * 네이티브(iOS/Android) 알림 서비스 — expo-notifications 로컬 알림.
 *
 * 개인정보 원칙: 로컬 알림만 사용한다.
 * - getExpoPushTokenAsync 등 푸시 토큰을 절대 발급하지 않는다.
 * - 어떤 데이터도 네트워크로 전송하지 않는다.
 * - 권한은 오직 이 앱의 알림 표시 목적에만 쓴다.
 */

// 앱이 포그라운드일 때도 알림 배너를 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

class NativeNotificationService implements NotificationService {
  async requestPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  }

  async schedule({ title, body, at }: ScheduleOptions): Promise<string | null> {
    // DATE 트리거: 지정 시각에 '정확히 1회' 전달 (repeats 무시)
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
      },
    });
    return id;
  }

  async cancel(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export const notificationService: NotificationService = new NativeNotificationService();
