import { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * 렌더 중 예외를 잡아 화면 전체 크래시를 막고, 로컬 로깅 + 복구 버튼을 제공한다.
 * (H1: 크래시 처리·로깅)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    logger.error(error.message, 'render');
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>문제가 발생했어요</Text>
          <Text style={styles.body}>
            일시적인 오류로 화면을 표시하지 못했습니다. 데이터는 안전하게 보관돼 있어요.
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset} accessibilityRole="button">
            <Text style={styles.buttonText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  body: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  button: { backgroundColor: '#2f6fed', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
