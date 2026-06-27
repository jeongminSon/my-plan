/**
 * 보호 게이트의 상태 결정 (순수 함수 — 화면과 분리, 단위 테스트 대상).
 *  - loading: 세션 확인 중 → 로딩 표시(깜빡임 방지)
 *  - unauthenticated: 세션 없음 → 로그인 화면(fallback)
 *  - authenticated: 세션 있음 → 보호된 앱
 */
export type GateState = 'loading' | 'unauthenticated' | 'authenticated';

export function gateState(input: { loading: boolean; hasSession: boolean }): GateState {
  if (input.loading) return 'loading';
  return input.hasSession ? 'authenticated' : 'unauthenticated';
}
