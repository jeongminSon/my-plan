import { gateState } from './supabaseGate';

describe('gateState', () => {
  it('확인 중이면 loading', () => {
    expect(gateState({ loading: true, hasSession: false })).toBe('loading');
    expect(gateState({ loading: true, hasSession: true })).toBe('loading');
  });

  it('확인 끝 + 세션 없음 → unauthenticated', () => {
    expect(gateState({ loading: false, hasSession: false })).toBe('unauthenticated');
  });

  it('확인 끝 + 세션 있음 → authenticated', () => {
    expect(gateState({ loading: false, hasSession: true })).toBe('authenticated');
  });
});
