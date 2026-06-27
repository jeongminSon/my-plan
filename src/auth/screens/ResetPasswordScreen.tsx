import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { sendPasswordReset, updatePassword, verifyRecoveryCode } from '../passwordReset';
import { isValidEmail, MESSAGES, SignupErrors, validateNewPassword } from '../validation';
import { AuthField } from './AuthField';
import { makeAuthStyles, PressableState, webFocusRing } from './authStyles';

interface Props {
  onSwitchToLogin: () => void;
}

/**
 * 비밀번호 재설정 — 딥링크 대신 6자리 코드 방식(웹/앱 공통, 회원가입과 동일 패턴).
 * 1) 이메일 입력 → 코드 발송  2) 코드 + 새 비밀번호 입력 → verifyOtp(recovery) → updateUser
 * 열거 방지: 존재하지 않는 이메일도 동일하게 코드 입력 단계로 진행.
 */
export function ResetPasswordScreen({ onSwitchToLogin }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeAuthStyles(theme), [theme]);
  const [stage, setStage] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState('');
  const [resending, setResending] = useState(false);

  const requestCode = async () => {
    if (submitting) return;
    setTopError('');
    if (!isValidEmail(email)) {
      setTopError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    setSubmitting(true);
    const r = await sendPasswordReset(email);
    setSubmitting(false);
    if (r.networkError) {
      setTopError(MESSAGES.network);
      return;
    }
    setStage('verify'); // 항상 코드 입력 단계로(열거 방지)
  };

  const resend = async () => {
    if (resending) return;
    setResending(true);
    setTopError('');
    await sendPasswordReset(email);
    setResending(false);
  };

  const verifyAndSet = async () => {
    if (submitting) return;
    setTopError('');
    const v = validateNewPassword({ password, confirm });
    setErrors(v);
    if (v.password || v.confirm) return;
    if (code.trim().length < 6) {
      setTopError('이메일로 받은 인증 코드를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    const vr = await verifyRecoveryCode(email, code.trim());
    if (!vr.ok) {
      setSubmitting(false);
      setTopError(vr.error ?? MESSAGES.generic);
      return;
    }
    const ur = await updatePassword(password);
    setSubmitting(false);
    if (!ur.ok) {
      setTopError(ur.error ?? MESSAGES.generic);
      return;
    }
    // 성공 → 세션 생성됨 → AuthGate가 앱으로 전환(별도 네비게이션 불필요)
  };

  const banner = topError ? (
    <View style={[s.banner, s.bannerError]} accessibilityLiveRegion="polite">
      <Icon name="alert-triangle" size={16} color={theme.danger} />
      <Text style={s.bannerTextError}>{topError}</Text>
    </View>
  ) : null;

  if (stage === 'verify') {
    return (
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.title}>새 비밀번호 설정</Text>
          <Text style={s.subtitle}>{email.trim()} 로 보낸 인증 코드와 새 비밀번호를 입력하세요.</Text>
          {banner}

          <View>
            <Text style={s.label}>인증 코드</Text>
            <TextInput
              style={s.otpInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="00000000"
              placeholderTextColor={theme.textFaint}
              editable={!submitting}
              textAlign="center"
              accessibilityLabel="인증 코드"
            />
          </View>

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
            onSubmitEditing={verifyAndSet}
            editable={!submitting}
          />

          <Pressable
            style={(st) => [
              s.button,
              submitting && s.buttonDisabled,
              webFocusRing((st as PressableState).focused ?? false, theme.text),
            ]}
            onPress={verifyAndSet}
            disabled={submitting}
            accessibilityRole="button"
          >
            {submitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
            <Text style={s.buttonText}>{submitting ? '변경 중…' : '비밀번호 변경'}</Text>
          </Pressable>

          <View style={s.linkRow}>
            <Text style={s.linkMuted}>코드를 못 받으셨나요?</Text>
            <Pressable
              onPress={resend}
              accessibilityRole="link"
              disabled={resending}
              style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
            >
              <Text style={s.link}>{resending ? '전송 중…' : '코드 재전송'}</Text>
            </Pressable>
          </View>
          <View style={s.linkRow}>
            <Pressable
              onPress={onSwitchToLogin}
              accessibilityRole="link"
              style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
            >
              <Text style={s.linkMuted}>로그인으로 돌아가기</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Text style={s.title}>비밀번호 찾기</Text>
        <Text style={s.subtitle}>가입한 이메일로 인증 코드를 보내드려요.</Text>
        {banner}

        <AuthField
          label="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          returnKeyType="done"
          onSubmitEditing={requestCode}
          editable={!submitting}
        />

        <Pressable
          style={(st) => [
            s.button,
            submitting && s.buttonDisabled,
            webFocusRing((st as PressableState).focused ?? false, theme.text),
          ]}
          onPress={requestCode}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
          <Text style={s.buttonText}>{submitting ? '보내는 중…' : '인증 코드 받기'}</Text>
        </Pressable>

        <View style={s.linkRow}>
          <Pressable
            onPress={onSwitchToLogin}
            accessibilityRole="link"
            style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
          >
            <Text style={s.link}>로그인으로 돌아가기</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
