import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthGate } from './src/auth/AuthGate';
import { AppBackground } from './src/components/AppBackground';
import { AuthScreen } from './src/auth/screens/AuthScreen';
import { NewPasswordScreen } from './src/auth/screens/NewPasswordScreen';
import { SupabaseAuthProvider, useSupabaseAuth } from './src/auth/SupabaseAuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { taskRepository } from './src/data/db';
import { SupabaseTaskRepository } from './src/data/supabaseRepository';
import { runMigration } from './src/migration/runMigration';
import { logger } from './src/services/logger';
import { notificationService } from './src/services/notifications';
import { supabase } from './src/supabase/client';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { Theme } from './src/theme/theme';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <SupabaseAuthProvider>
            <ThemedRoot />
          </SupabaseAuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function ThemedRoot() {
  const theme = useTheme();
  const { passwordRecovery, session, configured } = useSupabaseAuth();

  // 시간대 적응 배경: AppState가 active로 복귀할 때 시각 재계산(경계 넘으면 배경 갱신)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(new Date());
    });
    return () => sub.remove();
  }, []);

  // 메인(정보 밀집)=subtle, 인증/복구=full
  const showingMain = !passwordRecovery && (!configured || !!session);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <AppBackground intensity={showingMain ? 'subtle' : 'full'} now={now}>
        {passwordRecovery ? (
          // 비밀번호 재설정 복귀 → 새 비밀번호 설정(세션 있어도 우선)
          <NewPasswordScreen />
        ) : (
          <AuthGate fallback={<AuthScreen />}>
            <AppData />
          </AuthGate>
        )}
      </AppBackground>
    </SafeAreaView>
  );
}

/** 로그인+Supabase 설정 시 클라우드 저장소, 아니면 로컬 저장소 */
function AppData() {
  const { session, configured } = useSupabaseAuth();
  if (configured && session && supabase) {
    return <CloudApp userId={session.user.id} />;
  }
  return <TaskListScreen repository={taskRepository} notifications={notificationService} />;
}

/** 클라우드 저장소 + 1회성 마이그레이션 게이트(유실 방지). */
function CloudApp({ userId }: { userId: string }) {
  const theme = useTheme();
  const repo = useMemo(() => new SupabaseTaskRepository(supabase!, userId), [userId]);
  const [phase, setPhase] = useState<'migrating' | 'ready' | 'error'>('migrating');

  const run = useCallback(() => {
    setPhase('migrating');
    runMigration(taskRepository, repo, userId)
      .then((r) => setPhase(r.status === 'failed' ? 'error' : 'ready'))
      .catch((e) => {
        logger.error(e instanceof Error ? e.message : String(e), 'migration');
        setPhase('error');
      });
  }, [repo, userId]);

  useEffect(() => run(), [run]);

  if (phase === 'migrating') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.msg, { color: theme.textMuted }]}>데이터 준비 중…</Text>
      </View>
    );
  }
  if (phase === 'error') {
    return <MigrationError theme={theme} onRetry={run} onSkip={() => setPhase('ready')} />;
  }
  return <TaskListScreen repository={repo} notifications={notificationService} />;
}

function MigrationError({
  theme,
  onRetry,
  onSkip,
}: {
  theme: Theme;
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: theme.text }]}>데이터 준비에 실패했어요</Text>
      <Text style={[styles.msg, { color: theme.textMuted }]}>
        기존 기기 데이터를 옮기는 중 문제가 생겼어요. 데이터는 안전하게 보관돼 있어요.
      </Text>
      <Pressable
        style={[styles.retry, { backgroundColor: theme.primary }]}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={[styles.retryText, { color: theme.onPrimary }]}>다시 시도</Text>
      </Pressable>
      <Pressable style={styles.skip} onPress={onSkip} accessibilityRole="button">
        <Text style={[styles.skipText, { color: theme.textMuted }]}>건너뛰고 시작하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  msg: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  retry: { minHeight: 48, borderRadius: 10, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  retryText: { fontSize: 16, fontWeight: '700' },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600' },
});
