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
 *
 * ⚠️ 절대 예외를 던지지 않는다(항상 OAuthResult 반환) — 호출부 상태(스피너 등)가 갇히지 않게.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
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

    // 네이티브: 명시적 복귀 주소(myplan://auth-callback) — Supabase Redirect URLs의 myplan://* 와 매칭
    const redirectTo = makeRedirectUri({ scheme: 'myplan', path: 'auth-callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return { ok: false, error: error?.message ?? 'OAuth URL을 받지 못했습니다.' };
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'cancel' || res.type === 'dismiss') {
      return { ok: false, error: '로그인이 취소되었습니다.' };
    }
    if (res.type !== 'success' || !res.url) {
      return { ok: false, error: '로그인을 완료하지 못했어요. 다시 시도해 주세요.' };
    }

    // 복귀 URL에서 코드(또는 오류) 추출
    const parsed = new URL(res.url);
    const errDesc = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error');
    if (errDesc) return { ok: false, error: errDesc };
    const code = parsed.searchParams.get('code');
    if (!code) return { ok: false, error: '인증 코드를 받지 못했어요.' };

    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) return { ok: false, error: exErr.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '구글 로그인 중 오류가 발생했어요.' };
  }
}
