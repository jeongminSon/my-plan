import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/id';

/**
 * 동기화 설정(기기 공통, AsyncStorage). 웹은 localStorage, 네이티브는 기기 저장소로 동작한다.
 *
 * - userKey: 사용자(데이터) 식별 키. 같은 키를 다른 기기에 입력하면 데이터가 공유된다.
 *   OAuth 도입 전까지의 익명 동기화 키이며, 개인정보(이메일 등)를 담지 않는다.
 * - cursor: 마지막으로 받은 서버 시퀀스.
 */
const USER_KEY = 'my-plan.sync.userKey';
const CURSOR_KEY = 'my-plan.sync.cursor';

export async function getOrCreateUserKey(): Promise<string> {
  let key = await AsyncStorage.getItem(USER_KEY);
  if (!key) {
    key = `${generateId()}${generateId()}`.replace(/-/g, '');
    await AsyncStorage.setItem(USER_KEY, key);
  }
  return key;
}

export async function setUserKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) return;
  await AsyncStorage.setItem(USER_KEY, trimmed);
  // 다른 데이터셋으로 전환하므로 커서 초기화(전체 다시 받기)
  await AsyncStorage.setItem(CURSOR_KEY, '0');
}

export async function getCursor(): Promise<number> {
  const raw = await AsyncStorage.getItem(CURSOR_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function setCursor(value: number): Promise<void> {
  await AsyncStorage.setItem(CURSOR_KEY, String(value));
}
