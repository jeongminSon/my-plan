import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseTaskRepository } from '../data/supabaseRepository';
import { logger } from '../services/logger';

/**
 * 계정 삭제 + 데이터 파기.
 * 1) 본인 데이터(todos/lists) 삭제 — 반드시 성공해야 함
 * 2) 인증 계정 삭제 — service_role이 필요해 Edge Function(delete-account)에 위임(best-effort)
 * 3) 로그아웃 → 게이트가 로그인 화면으로
 *
 * service_role 키는 프런트에 두지 않는다(Edge Function 서버 환경변수).
 */
export async function deleteAccount(
  supabase: SupabaseClient,
  repo: SupabaseTaskRepository
): Promise<void> {
  // 1) 데이터 파기(필수)
  await repo.deleteAllData();

  // 2) 인증 계정 삭제(Edge Function). 미배포 시에도 데이터는 이미 파기됨 → 로그아웃은 진행.
  try {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) logger.warn(`auth 계정 삭제 함수 오류: ${error.message}`, 'account');
  } catch (e) {
    logger.warn(e instanceof Error ? e.message : 'delete-account invoke 실패', 'account');
  }

  // 3) 로그아웃
  await supabase.auth.signOut();
}
