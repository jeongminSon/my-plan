/**
 * 알림 서비스 포트(인터페이스).
 *
 * 화면/코디네이터는 이 인터페이스에만 의존한다. 실제 구현은
 *  - notifications.ts      (네이티브, expo-notifications 로컬 알림)
 *  - notifications.web.ts  (웹, 브라우저 Notification API)
 *
 * 개인정보 원칙: **로컬 알림 전용**이다.
 * 푸시 토큰을 발급/수집하지 않고, 어떤 데이터도 네트워크로 보내지 않는다.
 * 알림 권한은 오직 이 앱의 알림 표시에만 사용한다.
 */
export interface ScheduleOptions {
  title: string;
  body?: string;
  /** 알림 시각 (epoch ms) */
  at: number;
}

export interface NotificationService {
  /** 알림 권한 요청 → 허용 여부 반환 */
  requestPermission(): Promise<boolean>;
  /** 지정 시각에 1회 알림 예약 → 알림 id (권한 없으면 null) */
  schedule(opts: ScheduleOptions): Promise<string | null>;
  /** 예약된 알림 취소 */
  cancel(id: string): Promise<void>;
}
