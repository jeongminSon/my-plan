/**
 * 구글 OAuth 클라이언트 ID 설정 (빌드 시 env 주입).
 *
 * Google Cloud Console에서 발급한 클라이언트 ID를 환경변수로 넣는다:
 *  - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     (웹/공통)
 *  - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (안드로이드)
 *  - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     (iOS, 선택)
 *
 * 값이 없으면 구글 로그인 UI를 숨기고 익명 동기화만 동작한다(빌드 안 깨짐).
 */
function env(name: string): string | undefined {
  return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
}

export const googleClientIds = {
  web: env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
  android: env('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  ios: env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
};

/** 구글 로그인 사용 가능 여부(클라이언트 ID가 하나라도 설정됨). */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(googleClientIds.web || googleClientIds.android || googleClientIds.ios);
}
