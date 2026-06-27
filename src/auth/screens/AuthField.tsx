import { useMemo, useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Theme } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import { PressableState, webFocusRing, webInputReset } from './authStyles';

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  secure?: boolean; // 비밀번호 필드(표시 토글 제공)
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: 'email' | 'password' | 'new-password' | 'off';
  returnKeyType?: 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
  editable?: boolean;
}

/**
 * 접근성 있는 라벨 입력 필드.
 * - 보이는 라벨 + accessibilityLabel 연결
 * - 탭 타깃 48px, Enter 제출
 * - 오류는 색만이 아니라 ⚠ 아이콘 + 문구로 표시
 */
export function AuthField({
  label,
  value,
  onChangeText,
  error,
  secure,
  placeholder,
  keyboardType,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  editable = true,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          error ? styles.inputRowError : undefined,
          webFocusRing(focused, theme.primary),
        ]}
      >
        <TextInput
          style={[styles.input, webInputReset]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure ? hidden : false}
          placeholder={placeholder}
          placeholderTextColor={theme.textFaint}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          accessibilityLabel={label}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            style={(st) => [
              styles.toggle,
              webFocusRing((st as PressableState).focused ?? false, theme.primary),
            ]}
            accessibilityRole="button"
            accessibilityLabel={hidden ? '비밀번호 표시' : '비밀번호 숨기기'}
            hitSlop={8}
          >
            <Text style={styles.toggleText}>{hidden ? '표시' : '숨김'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      backgroundColor: t.bg,
      minHeight: 48,
      paddingHorizontal: 12,
    },
    inputRowError: { borderColor: t.danger },
    input: { flex: 1, fontSize: 16, color: t.text, paddingVertical: 10 },
    toggle: { paddingHorizontal: 8, paddingVertical: 8 },
    toggleText: { fontSize: 13, color: t.primary, fontWeight: '600' },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    errorIcon: { color: t.danger, fontSize: 12 },
    errorText: { color: t.danger, fontSize: 12, flex: 1 },
  });
}
