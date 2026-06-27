import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { setCursor } from '../sync/syncSettings';
import { googleClientIds, isGoogleAuthConfigured } from './authConfig';
import { AuthSession, clearSession, loadSession, saveSession, sessionFromIdToken } from './authStore';

// 웹에서 OAuth 리다이렉트 결과를 마무리한다.
WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: AuthSession | null;
  configured: boolean;
  loading: boolean;
  signIn: () => Promise<AuthSession | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * 클라이언트 ID 설정 여부에 따라 구현을 가른다(설정값은 런타임에 고정이라 훅 규칙 안전).
 * - 미설정: 구글 훅을 호출하지 않는 무해한 익명 전용 Provider
 * - 설정됨: 구글 OAuth Provider
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return isGoogleAuthConfigured() ? (
    <GoogleAuthProvider>{children}</GoogleAuthProvider>
  ) : (
    <AnonAuthProvider>{children}</AnonAuthProvider>
  );
}

function AnonAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  useEffect(() => {
    loadSession().then((s) => setUser(s));
  }, []);
  const signOut = useCallback(async () => {
    await clearSession();
    await setCursor(0);
    setUser(null);
  }, []);
  return (
    <AuthContext.Provider
      value={{ user, configured: false, loading: false, signIn: async () => null, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const configured = true;
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: googleClientIds.web,
    androidClientId: googleClientIds.android,
    iosClientId: googleClientIds.ios,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    loadSession()
      .then((s) => setUser(s))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (): Promise<AuthSession | null> => {
    if (!configured || !request) return null;
    const result = await promptAsync();
    if (result?.type !== 'success') return null;
    const idToken =
      (result.params && (result.params as Record<string, string>).id_token) ||
      result.authentication?.idToken;
    if (!idToken) return null;
    const session = sessionFromIdToken(idToken);
    if (!session) return null;
    await saveSession(session);
    await setCursor(0); // 신원 변경 → 커서 초기화(전체 다시 받기)
    setUser(session);
    return session;
  }, [configured, request, promptAsync]);

  const signOut = useCallback(async () => {
    await clearSession();
    await setCursor(0);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, configured, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
