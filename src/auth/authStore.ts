import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJwtPayload } from './jwt';

/**
 * 로그인 세션(구글). 기기에 저장한다.
 * - idToken: 동기화 시 서버에 Bearer로 보내 검증받는다
 * - sub/email: 표시·식별용(서버가 권위 있게 재검증)
 * - expiresAt: 만료(epoch ms). 만료되면 재로그인 필요.
 */
export interface AuthSession {
  idToken: string;
  sub: string;
  email?: string;
  expiresAt: number;
}

const KEY = 'my-plan.auth.session';

/** id_token으로부터 세션 객체를 만든다(클레임 디코드는 표시용). */
export function sessionFromIdToken(idToken: string): AuthSession | null {
  const claims = decodeJwtPayload(idToken);
  if (!claims.sub) return null;
  return {
    idToken,
    sub: claims.sub,
    email: claims.email,
    expiresAt: claims.exp ? claims.exp * 1000 : Date.now() + 50 * 60 * 1000,
  };
}

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** 세션이 유효한가(존재 + 미만료, 30초 여유). */
export function isSessionValid(session: AuthSession | null, now: number): boolean {
  return Boolean(session && session.expiresAt - 30_000 > now);
}
