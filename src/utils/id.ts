/**
 * 고유 ID 생성 (외부 라이브러리 없이).
 *
 * 개인용 로컬 앱에서는 충돌 위험이 사실상 없으므로
 * timestamp(36진수) + 난수 조합으로 충분하다.
 * (UUID 표준이 꼭 필요하면 expo-crypto.randomUUID 로 교체 가능)
 */
export function generateId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${time}-${rand}`;
}
