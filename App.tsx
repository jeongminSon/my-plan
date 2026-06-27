import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
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
          <AuthProvider>
            <ThemedRoot />
          </AuthProvider>
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
      {/* 저장소·알림 서비스를 화면에 주입(플랫폼별 구현은 Metro가 선택) */}
      <TaskListScreen repository={taskRepository} notifications={notificationService} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
