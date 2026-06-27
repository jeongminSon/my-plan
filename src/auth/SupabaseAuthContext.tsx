import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../supabase/client';

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
  signOut: () => Promise<void>;
}

const Ctx = createContext<SupabaseAuthValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

    // 2) 로그인/로그아웃/토큰갱신 자동 반영
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const value: SupabaseAuthValue = {
    user: session?.user ?? null,
    session,
    loading,
    configured: isSupabaseConfigured(),
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSupabaseAuth(): SupabaseAuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  return ctx;
}
