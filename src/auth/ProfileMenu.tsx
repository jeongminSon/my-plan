import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SupabaseTaskRepository } from '../data/supabaseRepository';
import { supabase } from '../supabase/client';
import { Theme } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { deleteAccount } from './accountDeletion';
import { useSupabaseAuth } from './SupabaseAuthContext';

/**
 * 프로필/설정 메뉴 (로그아웃 배치).
 * Supabase 인증이 켜져 있고 로그인된 경우에만 표시한다.
 * signOut → 세션 제거 → AuthGate가 자동으로 로그인 화면으로 전환.
 */
export function ProfileMenu() {
  const { configured, session, user, signOut } = useSupabaseAuth();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!configured || !session) return null;

  const close = () => {
    setOpen(false);
    setConfirmingDelete(false);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (deleting || !supabase || !user) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const repo = new SupabaseTaskRepository(supabase, user.id);
      await deleteAccount(supabase, repo); // 데이터 파기 → 계정 삭제 → 로그아웃(게이트 전환)
    } catch {
      setDeleteError('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setDeleting(false);
    }
  };

  return (
    <>
      <Pressable
        style={styles.btn}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="프로필 메뉴"
        hitSlop={8}
      >
        <Text style={styles.btnText}>👤</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.email} numberOfLines={1}>
              📧 {user?.email ?? '계정'}
            </Text>

            {deleteError ? <Text style={styles.errorText}>⚠ {deleteError}</Text> : null}

            {confirmingDelete ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>계정과 모든 데이터가 영구 삭제됩니다. 진행할까요?</Text>
                <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={deleting} accessibilityRole="button">
                  {deleting ? <ActivityIndicator color={theme.onPrimary} /> : null}
                  <Text style={styles.deleteText}>{deleting ? '삭제 중…' : '영구 삭제'}</Text>
                </Pressable>
                <Pressable style={styles.closeBtn} onPress={() => setConfirmingDelete(false)} disabled={deleting} accessibilityRole="button">
                  <Text style={styles.closeText}>취소</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Pressable
                  style={styles.logoutBtn}
                  onPress={async () => {
                    close();
                    await signOut();
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.logoutText}>로그아웃</Text>
                </Pressable>
                <Pressable style={styles.dangerLink} onPress={() => setConfirmingDelete(true)} accessibilityRole="button">
                  <Text style={styles.dangerLinkText}>계정 삭제</Text>
                </Pressable>
                <Pressable style={styles.closeBtn} onPress={close} accessibilityRole="button">
                  <Text style={styles.closeText}>닫기</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: t.surfaceAlt },
    btnText: { fontSize: 14 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    sheet: { width: '100%', maxWidth: 320, backgroundColor: t.surface, borderRadius: 14, padding: 16, gap: 10 },
    email: { fontSize: 14, color: t.text, fontWeight: '600' },
    logoutBtn: { minHeight: 48, borderRadius: 10, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    logoutText: { color: t.text, fontWeight: '700', fontSize: 15 },
    closeBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    closeText: { color: t.textMuted, fontWeight: '600' },
    dangerLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    dangerLinkText: { color: t.danger, fontWeight: '600', fontSize: 14 },
    errorText: { color: t.danger, fontSize: 13 },
    confirmBox: { gap: 10 },
    confirmText: { color: t.text, fontSize: 14, lineHeight: 20 },
    deleteBtn: { minHeight: 48, borderRadius: 10, backgroundColor: t.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    deleteText: { color: t.onPrimary, fontWeight: '700', fontSize: 15 },
  });
}
