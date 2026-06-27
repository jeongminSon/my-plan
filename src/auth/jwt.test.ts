import { decodeJwtPayload } from './jwt';

function makeJwt(payload: object): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${b64}.signature`;
}

describe('decodeJwtPayload', () => {
  it('sub/email/exp를 디코드한다', () => {
    const token = makeJwt({ sub: '123456', email: 'test@example.com', exp: 1893456000 });
    const claims = decodeJwtPayload(token);
    expect(claims.sub).toBe('123456');
    expect(claims.email).toBe('test@example.com');
    expect(claims.exp).toBe(1893456000);
  });

  it('UTF-8 이름도 처리한다', () => {
    const token = makeJwt({ sub: '1', name: '손정민' });
    expect(decodeJwtPayload(token).name).toBe('손정민');
  });

  it('잘못된 토큰은 빈 객체', () => {
    expect(decodeJwtPayload('not-a-jwt')).toEqual({});
    expect(decodeJwtPayload('')).toEqual({});
  });
});
