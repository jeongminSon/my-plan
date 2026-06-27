import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
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

  if (!configured || !session) return null;

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

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.email} numberOfLines={1}>
              📧 {user?.email ?? '계정'}
            </Text>
            <Pressable
              style={styles.logoutBtn}
              onPress={async () => {
                setOpen(false);
                await signOut();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
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
    logoutBtn: { minHeight: 48, borderRadius: 10, backgroundColor: t.dangerBg, alignItems: 'center', justifyContent: 'center' },
    logoutText: { color: t.danger, fontWeight: '700', fontSize: 15 },
    closeBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    closeText: { color: t.textMuted, fontWeight: '600' },
  });
}
