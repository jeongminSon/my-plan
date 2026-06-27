import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { taskRepository } from './src/data/db';
import { notificationService } from './src/services/notifications';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedRoot />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function ThemedRoot() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {/* 저장소·알림 서비스를 화면에 주입(플랫폼별 구현은 Metro가 선택) */}
      <TaskListScreen repository={taskRepository} notifications={notificationService} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
