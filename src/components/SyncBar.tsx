import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { APP_VERSION } from '../appInfo';
import { SyncStore } from '../sync/SyncStore';
import { syncNow } from '../sync/SyncService';
import { getOrCreateUserKey, setUserKey } from '../sync/syncSettings';
import { logger } from '../services/logger';
import { Theme } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  store: SyncStore;
  onSynced: () => void;
}

/**
 * 클라우드 동기화 바.
 * - [동기화] 버튼: 서버와 한 번 동기화(push + pull, LWW)
 * - 동기화 코드: 다른 기기에 같은 코드를 입력하면 데이터가 공유된다(익명 키)
 */
export function SyncBar({ store, onSynced }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deviceKey, setDeviceKey] = useState('');
  const [codeInput, setCodeInput] = useState('');

  useEffect(() => {
    getOrCreateUserKey().then(setDeviceKey).catch(() => {});
  }, []);

  const handleSync = async () => {
    if (busy) return;
    setBusy(true);
    setStatus('동기화 중…');
    try {
      const r = await syncNow(store);
      setStatus(`✓ 동기화됨 (↑${r.pushed} ↓${r.pulled})`);
      onSynced();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(msg, 'sync');
      setStatus(`동기화 실패: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleApplyCode = async () => {
    const code = codeInput.trim();
    if (code.length < 8) {
      setStatus('동기화 코드는 8자 이상이어야 합니다.');
      return;
    }
    await setUserKey(code);
    setDeviceKey(code);
    setCodeInput('');
    setStatus('코드 적용됨 — 이제 동기화하세요.');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable style={styles.syncBtn} onPress={handleSync} disabled={busy} accessibilityRole="button">
          <Text style={styles.syncBtnText}>⟳ 동기화</Text>
        </Pressable>
        <Text style={styles.status} numberOfLines={1}>
          {status}
        </Text>
        <Pressable onPress={() => setExpanded((e) => !e)} accessibilityLabel="동기화 코드" hitSlop={8}>
          <Text style={styles.codeToggle}>{expanded ? '닫기' : '코드'}</Text>
        </Pressable>
        <Text style={styles.version}>v{APP_VERSION}</Text>
      </View>

      {expanded ? (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>이 기기의 동기화 코드(다른 기기에 입력하면 공유)</Text>
          <TextInput style={styles.codeBox} value={deviceKey} editable={false} selectTextOnFocus />
          <Text style={styles.panelLabel}>다른 기기 코드 적용</Text>
          <View style={styles.applyRow}>
            <TextInput
              style={styles.input}
              placeholder="동기화 코드 붙여넣기"
              placeholderTextColor={theme.textFaint}
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.applyBtn} onPress={handleApplyCode} accessibilityRole="button">
              <Text style={styles.applyBtnText}>적용</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { marginHorizontal: 16, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    syncBtn: { backgroundColor: t.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    syncBtnText: { color: t.primary, fontWeight: '700', fontSize: 13 },
    status: { flex: 1, color: t.textMuted, fontSize: 12 },
    codeToggle: { color: t.textMuted, fontSize: 12, fontWeight: '600' },
    version: { color: t.textFaint, fontSize: 11 },
    panel: { marginTop: 10, padding: 12, backgroundColor: t.surface, borderRadius: 10, gap: 6 },
    panelLabel: { color: t.textMuted, fontSize: 12 },
    codeBox: {
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: t.text,
      backgroundColor: t.bg,
      fontSize: 12,
    },
    applyRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: t.text,
      backgroundColor: t.bg,
      fontSize: 13,
    },
    applyBtn: { backgroundColor: t.primary, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
    applyBtnText: { color: t.onPrimary, fontWeight: '700' },
  });
}
