import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { isSupabaseConfigured, recovery, supabase } from '../supabase/client';
import { clearLocalCacheOnLogout } from './localCleanup';

/**
 * Supabase 인증 전역 상태 (화면과 분리 — 데이터/세션 로직만).
 * - 앱 시작 시 getSession()으로 기존 세션 복원
 * - onAuthStateChange로 로그인/로그아웃/토큰갱신 자동 반영
 * - Supabase 미설정 시: 무해하게 loading=false, user/session=null
 */
interface SupabaseAuthValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  /** 비밀번호 재설정 링크로 복귀한 상태(새 비밀번호 설정 화면을 띄움) */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SupabaseAuthValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // 모듈 로드 시점에 캡처된 복구 이벤트(마운트 전 발생분)도 반영
  const [passwordRecovery, setPasswordRecovery] = useState(recovery.get());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    // 1) 기존 세션 복원
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    // 2) 로그인/로그아웃/토큰갱신/비밀번호복구 자동 반영
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });

    // 3) 모듈 레벨 복구 플래그 동기화(이벤트를 React보다 먼저 받았어도 반영)
    setPasswordRecovery(recovery.get());
    const unsubRecovery = recovery.subscribe(() => setPasswordRecovery(true));

    // 4) 웹: 메일 링크가 같은 탭에서 해시만 바꿔 새로고침이 안 되는 경우 →
    //    type=recovery 해시 감지 시 새로고침해 detectSessionInUrl이 토큰을 처리하게 함
    let removeHash: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onHash = () => {
        if (/type=recovery/.test(window.location.hash)) window.location.reload();
      };
      window.addEventListener('hashchange', onHash);
      removeHash = () => window.removeEventListener('hashchange', onHash);
    }

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      unsubRecovery();
      removeHash?.();
    };
  }, []);

  // 네이티브: 비밀번호 재설정 딥링크(myplan://reset#...type=recovery) 처리
  // (웹은 detectSessionInUrl이 자동 처리하므로 제외)
  useEffect(() => {
    if (Platform.OS === 'web' || !supabase) return;
    const client = supabase;
    let cancelled = false;

    const handle = async (url: string | null) => {
      if (!url || cancelled) return;
      const isRecovery = /type=recovery/.test(url) || /(:|\/)reset(\b|[?#/])/.test(url);
      if (!isRecovery) return;
      const frag = url.includes('#')
        ? url.slice(url.indexOf('#') + 1)
        : url.includes('?')
          ? url.slice(url.indexOf('?') + 1)
          : '';
      const p = new URLSearchParams(frag);
      const at = p.get('access_token');
      const rt = p.get('refresh_token');
      const code = p.get('code');
      try {
        if (at && rt) await client.auth.setSession({ access_token: at, refresh_token: rt });
        else if (code) await client.auth.exchangeCodeForSession(code);
        else return;
        if (!cancelled) setPasswordRecovery(true); // 새 비밀번호 화면으로
      } catch {
        // 잘못된/만료 토큰 — 무시(사용자는 다시 요청)
      }
    };

    Linking.getInitialURL().then(handle); // 앱이 꺼져 있다가 링크로 열린 경우
    const sub = Linking.addEventListener('url', (e) => handle(e.url)); // 앱이 떠 있는 경우
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const signOut = useCallback(async () => {
    const userId = session?.user?.id; // 로그아웃 전 사용자 id 확보
    if (supabase) await supabase.auth.signOut();
    // 이전 완료 시에만 비로그인 로컬 캐시(평문) 정리(미이전 데이터 유실 방지)
    await clearLocalCacheOnLogout(userId);
  }, [session]);

  const clearPasswordRecovery = useCallback(() => {
    recovery.clear();
    setPasswordRecovery(false);
  }, []);

  const value: SupabaseAuthValue = {
    user: session?.user ?? null,
    session,
    loading,
    configured: isSupabaseConfigured(),
    passwordRecovery,
    clearPasswordRecovery,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSupabaseAuth(): SupabaseAuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  return ctx;
}
