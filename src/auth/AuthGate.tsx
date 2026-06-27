import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { gateState } from './supabaseGate';
import { useSupabaseAuth } from './SupabaseAuthContext';

/**
 * 보호 게이트(라우터 없는 단일 화면용 ProtectedRoute 대체).
 *  - 인증 확인 중: 로딩(깜빡임 방지)
 *  - 미로그인: fallback(다음 단계의 로그인 화면)
 *  - 로그인: children(보호된 앱)
 *
 * 1단계에서는 컴포넌트만 제공하고, 실제 적용(App에서 감싸기)은 로그인 UI가 생기는 다음 단계에서 한다.
 */
export function AuthGate({
  children,
  fallback,
  loadingView,
}: {
  children: ReactNode;
  fallback: ReactNode;
  loadingView?: ReactNode;
}) {
  const { loading, session, configured } = useSupabaseAuth();
  // Supabase 미설정 시 게이트 통과(기존 앱 그대로 동작 — 비파괴)
  if (!configured) return <>{children}</>;
  const state = gateState({ loading, hasSession: !!session });

  if (state === 'loading') {
    return (
      loadingView ?? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )
    );
  }
  if (state === 'unauthenticated') return <>{fallback}</>;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
