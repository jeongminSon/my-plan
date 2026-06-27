import { getStore } from '@netlify/blobs';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();

/**
 * 구글 id_token 검증 → 검증된 sub 반환.
 * audience(허용 클라이언트 ID)는 Netlify 환경변수 GOOGLE_ALLOWED_AUDIENCES(쉼표구분)에서 읽는다.
 */
async function verifyGoogleSub(idToken) {
  const audiences = (process.env.GOOGLE_ALLOWED_AUDIENCES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (audiences.length === 0) {
    throw new Error('GOOGLE_ALLOWED_AUDIENCES 미설정');
  }
  const ticket = await googleClient.verifyIdToken({ idToken, audience: audiences });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub) throw new Error('invalid token payload');
  return payload.sub;
}

/**
 * 동기화 서버 (Netlify Function + Netlify Blobs).
 *
 * 엔드포인트: /.netlify/functions/sync
 *  - POST  { tasks, lists }   : 변경분 업로드(서버측 LWW로 최신만 보존)
 *  - GET   ?since=<seq>        : since 이후 변경분 + 새 cursor 반환
 *
 * 보안:
 *  - 전송 구간 HTTPS(Netlify 기본 TLS)
 *  - x-sync-key 헤더로 사용자별 데이터 격리(키별 별도 blob)
 *  - 저장은 Netlify Blobs(서버측 관리). 분석/제3자 전송 없음.
 *
 * 데모 수준 백엔드입니다(익명 키 기반). 실서비스에서는 OAuth + 행단위 인증을 더하세요.
 */
export default async (req) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-sync-key',
  };
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });

  const url = new URL(req.url);

  // 인증: 구글 Bearer(검증) 우선, 없으면 익명 x-sync-key
  let userKey;
  const authz = req.headers.get('authorization');
  if (authz && authz.startsWith('Bearer ')) {
    try {
      const sub = await verifyGoogleSub(authz.slice(7));
      userKey = `g:${sub}`; // 구글 계정별 격리
    } catch (e) {
      return Response.json({ error: `invalid google token: ${e.message}` }, { status: 401, headers: cors });
    }
  } else {
    userKey = req.headers.get('x-sync-key') || url.searchParams.get('key');
  }
  if (!userKey || userKey.length < 8) {
    return Response.json({ error: 'missing or invalid auth' }, { status: 400, headers: cors });
  }

  const store = getStore('my-plan-sync');
  const state = (await store.get(userKey, { type: 'json' })) || { tasks: {}, lists: {}, seq: 0 };

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'invalid json' }, { status: 400, headers: cors });
    }
    const accept = (mapName, records) => {
      for (const rec of records ?? []) {
        if (!rec || typeof rec.id !== 'string' || typeof rec.updatedAt !== 'number') continue;
        const ex = state[mapName][rec.id];
        if (ex && ex.rec.updatedAt > rec.updatedAt) continue; // 서버가 더 최신 → 거부(LWW)
        state.seq += 1;
        state[mapName][rec.id] = { rec: { ...rec, dirty: false }, seq: state.seq };
      }
    };
    accept('tasks', body.tasks);
    accept('lists', body.lists);
    await store.setJSON(userKey, state);
    return Response.json({ ok: true, cursor: state.seq }, { headers: cors });
  }

  // GET = pull
  const since = Number(url.searchParams.get('since') || 0) || 0;
  const pick = (mapName) =>
    Object.values(state[mapName])
      .filter((e) => e.seq > since)
      .map((e) => e.rec);
  return Response.json(
    { tasks: pick('tasks'), lists: pick('lists'), cursor: state.seq },
    { headers: cors }
  );
};
