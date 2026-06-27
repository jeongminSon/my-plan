import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { useSupabaseAuth } from '../SupabaseAuthContext';
import { updatePassword } from '../passwordReset';
import { MESSAGES, SignupErrors, validateNewPassword } from '../validation';
import { AuthField } from './AuthField';
import { makeAuthStyles, PressableState, webFocusRing } from './authStyles';

/**
 * 비밀번호 재설정 링크로 복귀(PASSWORD_RECOVERY)했을 때 새 비밀번호를 설정하는 화면.
 * 성공 시 복구 상태를 해제 → 일반 세션으로 앱에 진입.
 */
export function NewPasswordScreen() {
  const theme = useTheme();
  const s = useMemo(() => makeAuthStyles(theme), [theme]);
  const { clearPasswordRecovery, signOut } = useSupabaseAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState('');

  const handleSubmit = async () => {
    if (submitting) return;
    setTopError('');
    const v = validateNewPassword({ password, confirm });
    setErrors(v);
    if (v.password || v.confirm) return;
    setSubmitting(true);
    const r = await updatePassword(password);
    setSubmitting(false);
    if (!r.ok) {
      setTopError(r.error ?? MESSAGES.generic);
      return;
    }
    clearPasswordRecovery(); // 새 세션으로 앱 진입
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Text style={s.title}>새 비밀번호 설정</Text>
        <Text style={s.subtitle}>사용할 새 비밀번호를 입력하세요.</Text>

        {topError ? (
          <View style={[s.banner, s.bannerError]} accessibilityLiveRegion="polite">
            <Icon name="alert-triangle" size={16} color={theme.danger} />
            <Text style={s.bannerTextError}>{topError}</Text>
          </View>
        ) : null}

        <AuthField
          label="새 비밀번호"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          secure
          autoComplete="new-password"
          placeholder="8자 이상, 영문+숫자"
          returnKeyType="next"
          editable={!submitting}
        />
        <AuthField
          label="새 비밀번호 확인"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
          }}
          error={errors.confirm}
          secure
          autoComplete="new-password"
          placeholder="비밀번호 다시 입력"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
        />

        <Pressable
          style={(st) => [
            s.button,
            submitting && s.buttonDisabled,
            webFocusRing((st as PressableState).focused ?? false, theme.text),
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
          <Text style={s.buttonText}>{submitting ? '변경 중…' : '비밀번호 변경'}</Text>
        </Pressable>

        <View style={s.linkRow}>
          <Pressable
            onPress={async () => {
              clearPasswordRecovery();
              await signOut();
            }}
            accessibilityRole="link"
            style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
          >
            <Text style={s.linkMuted}>취소하고 로그인으로</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
