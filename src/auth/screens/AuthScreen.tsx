import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';

/**
 * 인증 화면 컨테이너. 라우터가 없으므로 /login ↔ /signup 을 내부 상태로 전환한다.
 * AuthGate의 fallback(미로그인 시)으로 사용된다.
 */
export function AuthScreen({ initial = 'login' }: { initial?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup'>(initial);
  return mode === 'login' ? (
    <LoginScreen onSwitchToSignup={() => setMode('signup')} />
  ) : (
    <SignupScreen onSwitchToLogin={() => setMode('login')} />
  );
}
