import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

export interface OAuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Supabase 구글 OAuth 로그인 (웹/네이티브 공통).
 * - 웹: signInWithOAuth 리다이렉트 → 돌아오면 detectSessionInUrl이 세션 처리
 * - 네이티브: PKCE + 외부 브라우저 → 코드 교환(exchangeCodeForSession)
 * 성공 시 onAuthStateChange가 발화 → AuthGate가 앱으로 전환.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase가 설정되지 않았습니다.' };

  if (Platform.OS === 'web') {
    const redirectTo =
      typeof window !== 'undefined' && window.location ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true }; // 브라우저가 구글로 리다이렉트됨
  }

  // 네이티브
  const redirectTo = makeRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { ok: false, error: error?.message ?? 'OAuth URL을 받지 못했습니다.' };

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success' || !res.url) return { ok: false, error: '로그인이 취소되었습니다.' };

  const code = new URL(res.url).searchParams.get('code');
  if (!code) return { ok: false, error: '인증 코드를 받지 못했습니다.' };

  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exErr) return { ok: false, error: exErr.message };
  return { ok: true };
}
