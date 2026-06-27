import {
  hasErrors,
  isNetworkError,
  isValidEmail,
  isValidPassword,
  passwordStrength,
  strengthLabel,
  validateNewPassword,
  validateSignup,
} from './validation';

describe('validateNewPassword (재설정)', () => {
  it('정책 미달 비밀번호 → password 오류', () => {
    const e = validateNewPassword({ password: 'short1', confirm: 'short1' });
    expect(e.password).toBeTruthy();
    expect(e.confirm).toBeUndefined();
  });
  it('확인 불일치 → confirm 오류', () => {
    const e = validateNewPassword({ password: 'abcd1234', confirm: 'abcd9999' });
    expect(e.password).toBeUndefined();
    expect(e.confirm).toBeTruthy();
  });
  it('유효하고 일치 → 오류 없음', () => {
    const e = validateNewPassword({ password: 'abcd1234', confirm: 'abcd1234' });
    expect(hasErrors(e)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('형식 검증', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('  user@test.co.kr ')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });
});

describe('isValidPassword (8자+영문+숫자)', () => {
  it('정책 검증', () => {
    expect(isValidPassword('abcd1234')).toBe(true);
    expect(isValidPassword('short1')).toBe(false); // 8자 미만
    expect(isValidPassword('abcdefgh')).toBe(false); // 숫자 없음
    expect(isValidPassword('12345678')).toBe(false); // 영문 없음
  });
});

describe('passwordStrength', () => {
  it('약/보통/강', () => {
    expect(passwordStrength('abc')).toBe('weak');
    expect(passwordStrength('abcd1234')).toBe('medium');
    expect(passwordStrength('abcd1234efgh!')).toBe('strong');
    expect(strengthLabel('weak')).toBe('약');
    expect(strengthLabel('strong')).toBe('강');
  });
});

describe('validateSignup', () => {
  it('모든 필드 정상이면 오류 없음', () => {
    const e = validateSignup({ email: 'a@b.com', password: 'abcd1234', confirm: 'abcd1234' });
    expect(hasErrors(e)).toBe(false);
  });
  it('이메일/비번/확인 각각 오류', () => {
    const e = validateSignup({ email: 'bad', password: 'short', confirm: 'nope' });
    expect(e.email).toBeDefined();
    expect(e.password).toBeDefined();
    expect(e.confirm).toBeDefined();
  });
  it('비밀번호 불일치', () => {
    const e = validateSignup({ email: 'a@b.com', password: 'abcd1234', confirm: 'abcd9999' });
    expect(e.confirm).toBeDefined();
    expect(e.password).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('네트워크/서버 오류 구분', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
    expect(isNetworkError({ message: 'Invalid login credentials', status: 400 })).toBe(false);
  });
});
