/**
 * 경량 로컬 로거 (외부 SDK 없음 — 데이터가 기기를 떠나지 않는다).
 *
 * 개인정보 원칙: 크래시/오류를 **로컬에만** 기록한다. 어떤 데이터도 네트워크로 보내지 않는다.
 * 향후 호스팅 크래시 서비스(Sentry 등)를 붙이려면 무엇이 외부로 나가는지 먼저 고지하고 동의를 받는다.
 *
 * 세션 통계로 "크래시 프리 세션율"을 근사 측정할 수 있게 카운터를 둔다.
 */
export interface LogEntry {
  level: 'error' | 'warn' | 'info';
  message: string;
  at: number;
  context?: string;
}

const RING_SIZE = 100;
const ring: LogEntry[] = [];
let errorCount = 0;

function push(entry: LogEntry): void {
  ring.push(entry);
  if (ring.length > RING_SIZE) ring.shift();
}

export const logger = {
  error(message: string, context?: string): void {
    errorCount += 1;
    const entry: LogEntry = { level: 'error', message, at: Date.now(), context };
    push(entry);
    // 개발 중 가시성을 위해 콘솔에도 출력(로컬 한정)
    console.error(`[my-plan] ${context ?? ''} ${message}`);
  },
  warn(message: string, context?: string): void {
    push({ level: 'warn', message, at: Date.now(), context });
    console.warn(`[my-plan] ${context ?? ''} ${message}`);
  },
  info(message: string, context?: string): void {
    push({ level: 'info', message, at: Date.now(), context });
  },
  /** 최근 로그 스냅샷(진단/문의용) */
  recent(): LogEntry[] {
    return [...ring];
  },
  /** 이번 세션 누적 오류 수 (크래시 프리 측정 근사용) */
  errorCount(): number {
    return errorCount;
  },
};
