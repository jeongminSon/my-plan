import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { SignupScreen } from './SignupScreen';

type Mode = 'login' | 'signup' | 'reset';

/**
 * 인증 화면 컨테이너. 라우터가 없으므로 /login ↔ /signup ↔ /reset 을 내부 상태로 전환한다.
 * AuthGate의 fallback(미로그인 시)으로 사용된다.
 */
export function AuthScreen({ initial = 'login' }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  if (mode === 'signup') return <SignupScreen onSwitchToLogin={() => setMode('login')} />;
  if (mode === 'reset') return <ResetPasswordScreen onSwitchToLogin={() => setMode('login')} />;
  return (
    <LoginScreen
      onSwitchToSignup={() => setMode('signup')}
      onSwitchToReset={() => setMode('reset')}
    />
  );
}
