import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

export interface ResetResult {
  ok: boolean;
  /** 네트워크 등 진짜 오류일 때만 채움. 존재하지 않는 이메일은 ok=true로 둠(열거 방지). */
  networkError?: boolean;
}

/**
 * 비밀번호 재설정 메일 발송.
 * - 메일의 링크 → redirectTo로 복귀 시 Supabase가 PASSWORD_RECOVERY 세션을 만든다.
 * - 열거 방지: 존재하지 않는 이메일도 화면에선 동일하게 "보냈다"고 안내한다.
 */
export async function sendPasswordReset(email: string): Promise<ResetResult> {
  if (!supabase) return { ok: false };
  const redirectTo =
    Platform.OS === 'web'
      ? typeof window !== 'undefined' && window.location
        ? window.location.origin
        : undefined
      : makeRedirectUri({ scheme: 'myplan', path: 'reset' });
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    // 네트워크 오류만 사용자에게 구분 안내, 그 외(존재하지 않는 이메일 포함)는 성공처럼 처리
    if (error && /network|fetch|연결/i.test(error.message)) return { ok: false, networkError: true };
    return { ok: true };
  } catch {
    return { ok: false, networkError: true };
  }
}

/** 복구 세션에서 새 비밀번호로 변경 */
export async function updatePassword(password: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase가 설정되지 않았습니다.' };
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '변경에 실패했어요.' };
  }
}
