import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { AuthGate } from './src/auth/AuthGate';
import { AuthScreen } from './src/auth/screens/AuthScreen';
import { SupabaseAuthProvider } from './src/auth/SupabaseAuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { taskRepository } from './src/data/db';
import { notificationService } from './src/services/notifications';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <SupabaseAuthProvider>
            <AuthProvider>
              <ThemedRoot />
            </AuthProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function ThemedRoot() {
  const theme = useTheme();
  return (
    // edges로 상태바/내비게이션바 영역을 안전하게 피한다(안드로이드 edge-to-edge 대응)
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {/* 보호 게이트: 로그인해야 앱 진입(Supabase 미설정 시 통과). 저장소·알림은 화면에 주입 */}
      <AuthGate fallback={<AuthScreen />}>
        <TaskListScreen repository={taskRepository} notifications={notificationService} />
      </AuthGate>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
