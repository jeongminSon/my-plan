/**
 * JWT 페이로드 디코드 (표시용 — 보안 검증은 서버에서 한다).
 * 외부 라이브러리/atob 없이 순수 JS로 base64url을 디코드한다(웹/네이티브 공통).
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(b64: string): string {
  let out = '';
  let bits = 0;
  let val = 0;
  for (const ch of b64) {
    if (ch === '=') break;
    const i = B64.indexOf(ch);
    if (i < 0) continue;
    val = (val << 6) | i;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((val >> bits) & 0xff);
    }
  }
  return out;
}

function utf8(bin: string): string {
  try {
    return decodeURIComponent(
      bin
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return bin;
  }
}

export interface JwtClaims {
  sub?: string;
  email?: string;
  exp?: number; // seconds
  name?: string;
}

export function decodeJwtPayload(token: string): JwtClaims {
  try {
    const part = token.split('.')[1];
    if (!part) return {};
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(utf8(base64Decode(b64))) as JwtClaims;
  } catch {
    return {};
  }
}
