/**
 * 동기화 서버 주소 해석.
 *
 * 우선순위:
 *  1) 빌드 시 주입된 EXPO_PUBLIC_SYNC_URL (네이티브/웹 공통, 절대 URL 권장)
 *  2) 웹에서 같은 사이트에 배포된 경우 상대 경로(Netlify Function)
 *
 * 네이티브(Android/iOS) 앱은 같은 출처가 없으므로 EXPO_PUBLIC_SYNC_URL을 반드시 설정해야 한다
 * (예: https://your-site.netlify.app/.netlify/functions/sync).
 */
export function syncBaseUrl(): string | undefined {
  const env =
    typeof process !== 'undefined' && process.env ? process.env.EXPO_PUBLIC_SYNC_URL : undefined;
  if (env) return env;
  if (typeof window !== 'undefined' && window.location) {
    return '/.netlify/functions/sync';
  }
  return undefined;
}
