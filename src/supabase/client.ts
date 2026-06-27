import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
        auth: {
          storage: AsyncStorage, // 웹=localStorage, 네이티브=기기 저장소
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // RN/Expo 환경(웹 매직링크는 다음 단계에서 처리)
        },
      })
    : null;
