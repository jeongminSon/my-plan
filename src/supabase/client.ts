import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Supabase 클라이언트 (anon 키). RLS로 보호되므로 anon 키는 프런트 노출 OK.
 * service_role 키는 절대 여기에 두지 않는다.
 *
 * 환경변수(.env, Expo가 EXPO_PUBLIC_* 자동 주입):
 *  - EXPO_PUBLIC_SUPABASE_URL
 *  - EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * 값이 없으면 클라이언트를 만들지 않고 null을 노출한다(빌드/앱 무해).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        db: { schema: 'public' }, // 스키마 명시(search_path와 무관하게 public 고정)
        auth: {
          storage: AsyncStorage, // 웹=localStorage, 네이티브=기기 저장소
          autoRefreshToken: true,
          persistSession: true,
          flowType: 'pkce', // OAuth(구글)·이메일 모두 안전한 PKCE
          detectSessionInUrl: Platform.OS === 'web', // 웹: OAuth 리다이렉트 세션 자동 처리
        },
      })
    : null;

// ── 비밀번호 재설정 복귀(PASSWORD_RECOVERY) 캡처 ────────────────────────
// 이 이벤트는 detectSessionInUrl 처리 중(React 마운트 전)에 발생할 수 있어,
// 모듈 로드 시점에 구독해 놓쳐도 플래그로 보존한다.
let recoveryFlag = false;
const recoveryListeners = new Set<() => void>();
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryFlag = true;
      recoveryListeners.forEach((fn) => fn());
    }
  });
}

export const recovery = {
  get: (): boolean => recoveryFlag,
  clear: (): void => {
    recoveryFlag = false;
  },
  subscribe: (fn: () => void): (() => void) => {
    recoveryListeners.add(fn);
    return () => recoveryListeners.delete(fn);
  },
};
