import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '../../supabase/client';
import { Theme } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import {
  isNetworkError,
  MESSAGES,
  passwordStrength,
  SignupErrors,
  strengthLabel,
  validateSignup,
} from '../validation';
import { AuthField } from './AuthField';
import { makeAuthStyles } from './authStyles';

interface Props {
  onSwitchToLogin: () => void;
}

export function SignupScreen({ onSwitchToLogin }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeAuthStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState('');
  const [signedUp, setSignedUp] = useState(false);

  const handleSubmit = async () => {
    if (submitting || !supabase) return; // 중복 제출 차단
    setTopError('');
    const v = validateSignup({ email, password, confirm });
    setErrors(v);
    if (v.email || v.password || v.confirm) return; // 검증 오류 → API 호출 안 함

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        const blob = `${error.message ?? ''} ${(error as { code?: string }).code ?? ''} ${
          (error as { status?: number }).status ?? ''
        }`.toLowerCase();
        if (isNetworkError(error)) setTopError(MESSAGES.network);
        else if (/rate limit|over_email|too many|429/.test(blob))
          setTopError('가입 메일 발송 한도를 넘었어요. 잠시 후(보통 1시간 이내) 다시 시도해 주세요.');
        else if (/registered|already|exists/.test(blob))
          setTopError('이미 가입된 이메일입니다. 로그인해 주세요.');
        else if (/signup.*disabled|not allowed/.test(blob))
          setTopError('현재 회원가입이 비활성화되어 있어요.');
        else setTopError(MESSAGES.generic);
      } else if (data.session) {
        // (Confirm email OFF인 경우) 자동 로그인 → AuthGate가 앱으로 전환
      } else {
        // 표준 흐름: 가입 완료 화면으로 전환(확인메일 인증 후 로그인)
        setSignedUp(true);
      }
    } catch (e) {
      setTopError(isNetworkError(e) ? MESSAGES.network : MESSAGES.generic);
    } finally {
      setSubmitting(false);
    }
  };

  // 가입 완료(확인메일 발송) → 전용 완료 화면 + 로그인 이동
  if (signedUp) {
    return (
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.title}>회원가입 완료 🎉</Text>
          <View style={[s.banner, s.bannerSuccess]} accessibilityLiveRegion="polite">
            <Text style={s.bannerIconSuccess}>✓</Text>
            <Text style={s.bannerTextSuccess}>
              {email.trim()} 로 확인 메일을 보냈어요. 메일의 링크로 인증한 뒤 로그인해 주세요.
            </Text>
          </View>
          <Pressable style={s.button} onPress={onSwitchToLogin} accessibilityRole="button">
            <Text style={s.buttonText}>로그인하러 가기</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Text style={s.title}>회원가입</Text>
        <Text style={s.subtitle}>이메일과 비밀번호로 계정을 만드세요.</Text>

        {topError ? (
          <View style={[s.banner, s.bannerError]} accessibilityLiveRegion="polite">
            <Text style={s.bannerIconError}>⚠</Text>
            <Text style={s.bannerTextError}>{topError}</Text>
          </View>
        ) : null}

        <AuthField
          label="이메일"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          returnKeyType="next"
          editable={!submitting}
        />
        <AuthField
          label="비밀번호"
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
        {password ? <StrengthMeter theme={theme} styles={s} password={password} /> : null}

        <AuthField
          label="비밀번호 확인"
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
          style={[s.button, submitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityState={{ busy: submitting, disabled: submitting }}
        >
          {submitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
          <Text style={s.buttonText}>{submitting ? '가입 중…' : '회원가입'}</Text>
        </Pressable>

        <View style={s.linkRow}>
          <Text style={s.linkMuted}>이미 계정이 있으세요?</Text>
          <Pressable onPress={onSwitchToLogin} accessibilityRole="link" disabled={submitting}>
            <Text style={s.link}>로그인</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function StrengthMeter({
  theme,
  styles,
  password,
}: {
  theme: Theme;
  styles: ReturnType<typeof makeAuthStyles>;
  password: string;
}) {
  const strength = passwordStrength(password);
  const filled = strength === 'weak' ? 1 : strength === 'medium' ? 2 : 3;
  const color = strength === 'weak' ? theme.danger : strength === 'medium' ? theme.priorityMed : theme.success;
  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthBars}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.strengthSeg, i < filled ? { backgroundColor: color } : undefined]} />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>비밀번호 강도: {strengthLabel(strength)}</Text>
    </View>
  );
}
