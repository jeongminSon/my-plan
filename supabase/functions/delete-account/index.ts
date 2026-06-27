// Supabase Edge Function: delete-account
// 배포: supabase functions deploy delete-account
// 필요한 환경변수(서버, service_role은 절대 프런트에 두지 않음):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (대시보드 → Edge Functions → Secrets)
//
// 호출자 JWT를 검증해 본인만 자기 계정을 삭제하도록 한다.
// @ts-nocheck  (Deno 런타임 — 앱 빌드(tsc)와 무관)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1) 호출자(본인) 확인
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  // 2) 관리자 권한으로 데이터 + 계정 파기
  const admin = createClient(url, serviceRole);
  await admin.from('todos').delete().eq('user_id', user.id);
  await admin.from('lists').delete().eq('user_id', user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'content-type': 'application/json' },
  });
});
