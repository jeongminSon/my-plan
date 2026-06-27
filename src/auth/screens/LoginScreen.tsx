import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { supabase } from '../../supabase/client';
import { useTheme } from '../../theme/ThemeContext';
import { signInWithGoogle } from '../supabaseGoogle';
import { isNetworkError, MESSAGES } from '../validation';
import { AuthField } from './AuthField';
import { makeAuthStyles, PressableState, webFocusRing } from './authStyles';

interface Props {
  onSwitchToSignup: () => void;
  onSwitchToReset: () => void;
}

/**
 * 로그인 화면.
 * - signInWithPassword
 * - 실패 시 계정 존재 여부를 노출하지 않는 표준 문구
 * - 네트워크 오류는 별도 안내
 * - 성공 시 세션이 생기면 AuthGate가 자동으로 앱으로 전환(별도 네비게이션 불필요)
 */
export function LoginScreen({ onSwitchToSignup, onSwitchToReset }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeAuthStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting && !googleBusy;

  const handleGoogle = async () => {
    if (googleBusy || submitting) return;
    setGoogleBusy(true);
    setError('');
    try {
      const r = await signInWithGoogle();
      if (!r.ok) setError(r.error ?? '구글 로그인에 실패했어요.');
      // 성공: 웹은 리다이렉트, 네이티브는 onAuthStateChange로 전환됨
    } catch (e) {
      setError(e instanceof Error ? e.message : '구글 로그인 오류');
    } finally {
      // 어떤 경우에도 상태를 풀어 이메일 로그인 버튼이 막히지 않게 한다(버그 수정)
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !supabase) return; // 중복 제출 차단
    setSubmitting(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(isNetworkError(authError) ? MESSAGES.network : MESSAGES.invalidCredentials);
      }
      // 성공: onAuthStateChange로 게이트가 전환됨
    } catch (e) {
      setError(isNetworkError(e) ? MESSAGES.network : MESSAGES.generic);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Text style={s.title}>로그인</Text>
        <Text style={s.subtitle}>my-plan 계정으로 로그인하세요.</Text>

        {error ? (
          <View style={[s.banner, s.bannerError]} accessibilityLiveRegion="polite">
            <Icon name="alert-triangle" size={16} color={theme.danger} />
            <Text style={s.bannerTextError}>{error}</Text>
          </View>
        ) : null}

        <AuthField
          label="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          returnKeyType="next"
          editable={!submitting}
        />
        <AuthField
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="password"
          placeholder="비밀번호"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
        />

        <Pressable
          style={(st) => [
            s.button,
            !canSubmit && s.buttonDisabled,
            webFocusRing((st as PressableState).focused ?? false, theme.text),
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit, busy: submitting }}
        >
          {submitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
          <Text style={s.buttonText}>{submitting ? '로그인 중…' : '로그인'}</Text>
        </Pressable>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>또는</Text>
          <View style={s.dividerLine} />
        </View>

        <Pressable
          style={(st) => [
            s.googleBtn,
            (googleBusy || submitting) && s.buttonDisabled,
            webFocusRing((st as PressableState).focused ?? false, theme.primary),
          ]}
          onPress={handleGoogle}
          disabled={googleBusy || submitting}
          accessibilityRole="button"
          accessibilityState={{ busy: googleBusy }}
        >
          {googleBusy ? <ActivityIndicator color={theme.text} /> : null}
          <Text style={s.googleBtnText}>{googleBusy ? '구글 연결 중…' : 'Google로 로그인'}</Text>
        </Pressable>

        <View style={s.linkRow}>
          <Text style={s.linkMuted}>계정이 없으세요?</Text>
          <Pressable
            onPress={onSwitchToSignup}
            accessibilityRole="link"
            disabled={submitting}
            style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
          >
            <Text style={s.link}>회원가입</Text>
          </Pressable>
        </View>
        <View style={s.linkRow}>
          <Pressable
            onPress={onSwitchToReset}
            accessibilityRole="link"
            disabled={submitting || googleBusy}
            style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
          >
            <Text style={s.link}>비밀번호 찾기</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
