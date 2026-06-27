/**
 * 고유 ID 생성 — RFC4122 v4 UUID (외부 라이브러리 없이, RN/Hermes/웹 공용).
 *
 * Supabase의 uuid 컬럼과 호환되도록 표준 UUID를 만든다.
 * (개인용 앱 규모에선 Math.random 기반으로 충돌 위험이 사실상 없다.)
 */
export function generateId(): string {
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4'; // 버전 4
    } else {
      const r = (Math.random() * 16) | 0;
      // 19번째 위치는 variant 비트(8,9,a,b)
      out += (i === 19 ? (r & 0x3) | 0x8 : r).toString(16);
    }
  }
  return out;
}
