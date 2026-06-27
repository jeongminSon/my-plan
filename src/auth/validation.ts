/**
 * 인증 폼 검증 + 비밀번호 강도 + 오류 메시지 매핑 (순수 함수 — 화면과 분리, 단위 테스트 대상).
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** 비밀번호 정책: 8자 이상 + 영문 + 숫자 */
export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export type Strength = 'weak' | 'medium' | 'strong';

export function passwordStrength(pw: string): Strength {
  if (!pw) return 'weak';
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 1) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

export function strengthLabel(s: Strength): string {
  return s === 'weak' ? '약' : s === 'medium' ? '보통' : '강';
}

/** 회원가입 폼 전체 검증 → 필드별 오류 메시지(없으면 빈 객체) */
export interface SignupErrors {
  email?: string;
  password?: string;
  confirm?: string;
}
export function validateSignup(input: {
  email: string;
  password: string;
  confirm: string;
}): SignupErrors {
  const errors: SignupErrors = {};
  if (!isValidEmail(input.email)) errors.email = '올바른 이메일 형식이 아닙니다.';
  if (!isValidPassword(input.password))
    errors.password = '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.';
  if (input.confirm !== input.password) errors.confirm = '비밀번호가 일치하지 않습니다.';
  return errors;
}

export function hasErrors(errors: SignupErrors): boolean {
  return Boolean(errors.email || errors.password || errors.confirm);
}

/** 새 비밀번호(재설정) 폼 검증 — 비밀번호 정책 + 확인 일치 */
export function validateNewPassword(input: { password: string; confirm: string }): SignupErrors {
  const errors: SignupErrors = {};
  if (!isValidPassword(input.password))
    errors.password = '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.';
  if (input.confirm !== input.password) errors.confirm = '비밀번호가 일치하지 않습니다.';
  return errors;
}

/** 네트워크 오류 여부(서버 오류와 구분해 별도 안내) */
export function isNetworkError(e: unknown): boolean {
  const msg =
    e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
  const m = msg.toLowerCase();
  return (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('failed to fetch') ||
    m.includes('연결') ||
    (e as { name?: string } | null)?.name === 'TypeError'
  );
}

export const MESSAGES = {
  // 로그인 실패: 계정 존재 여부를 노출하지 않는 표준 문구
  invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
  network: '네트워크 연결을 확인해 주세요.',
  generic: '문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
} as const;
