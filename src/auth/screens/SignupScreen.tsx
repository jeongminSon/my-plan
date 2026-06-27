import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
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
import { makeAuthStyles, PressableState, webFocusRing } from './authStyles';
import { PrivacyModal } from './PrivacyModal';

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
  const [agreed, setAgreed] = useState(false); // 개인정보 수집·이용 동의(필수)
  const [showPrivacy, setShowPrivacy] = useState(false);
  // 6자리 코드 인증
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async () => {
    if (submitting || !supabase) return; // 중복 제출 차단
    setTopError('');
    const v = validateSignup({ email, password, confirm });
    setErrors(v);
    if (v.email || v.password || v.confirm) return; // 검증 오류 → API 호출 안 함
    if (!agreed) {
      setTopError('개인정보 수집·이용에 동의해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      // 열거(enumeration) 방지: 가입 여부를 사전 확인하지 않는다.
      // 이미 가입된 이메일이어도 동일하게 인증 화면으로 진행 → Supabase의
      // email enumeration protection이 존재 여부를 숨긴다(UI로 구분 불가).
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        const blob = `${error.message ?? ''} ${(error as { code?: string }).code ?? ''} ${
          (error as { status?: number }).status ?? ''
        }`.toLowerCase();
        if (isNetworkError(error)) setTopError(MESSAGES.network);
        else if (/rate limit|over_email|too many|429/.test(blob))
          setTopError('가입 메일 발송 한도를 넘었어요. 잠시 후(보통 1시간 이내) 다시 시도해 주세요.');
        else if (/signup.*disabled|not allowed/.test(blob))
          setTopError('현재 회원가입이 비활성화되어 있어요.');
        else setTopError(MESSAGES.generic);
      } else if (data.session) {
        // (Confirm email OFF인 경우) 자동 로그인 → AuthGate가 앱으로 전환
      } else {
        // 가입 여부와 무관하게 동일하게 코드 인증 화면으로(열거 비노출)
        setSignedUp(true);
      }
    } catch (e) {
      setTopError(isNetworkError(e) ? MESSAGES.network : MESSAGES.generic);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6 || verifying || !supabase) return;
    setVerifying(true);
    setOtpError('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'signup',
      });
      if (error) {
        const blob = `${error.message ?? ''} ${(error as { code?: string }).code ?? ''}`.toLowerCase();
        if (isNetworkError(error)) setOtpError(MESSAGES.network);
        else if (/expired/.test(blob)) setOtpError('코드가 만료됐어요. 아래 재전송을 눌러 주세요.');
        else if (/invalid|incorrect|token|otp/.test(blob)) setOtpError('인증 코드가 올바르지 않아요.');
        else setOtpError(MESSAGES.generic);
      }
      // 성공: 세션 생성 → AuthGate가 앱으로 전환(별도 네비게이션 불필요)
    } catch (e) {
      setOtpError(isNetworkError(e) ? MESSAGES.network : MESSAGES.generic);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || !supabase) return;
    setResending(true);
    setOtpError('');
    setResent(false);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
      if (error) {
        const blob = `${error.message ?? ''} ${(error as { code?: string }).code ?? ''}`.toLowerCase();
        if (/rate limit|over_email|too many|429/.test(blob))
          setOtpError('재전송 한도를 넘었어요. 잠시 후 다시 시도해 주세요.');
        else setOtpError(MESSAGES.generic);
      } else {
        setResent(true);
      }
    } catch (e) {
      setOtpError(isNetworkError(e) ? MESSAGES.network : MESSAGES.generic);
    } finally {
      setResending(false);
    }
  };

  // 가입 후 → 6자리 코드 인증 화면
  if (signedUp) {
    return (
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.title}>이메일 인증</Text>
          <Text style={s.subtitle}>{email.trim()} 로 보낸 인증 코드를 입력하세요.</Text>
          <Text style={s.hint}>
            코드가 오지 않으면 이미 가입된 계정일 수 있어요. 로그인을 시도해 보세요.
          </Text>

          {otpError ? (
            <View style={[s.banner, s.bannerError]} accessibilityLiveRegion="polite">
              <Icon name="alert-triangle" size={16} color={theme.danger} />
              <Text style={s.bannerTextError}>{otpError}</Text>
            </View>
          ) : null}
          {resent ? (
            <View style={[s.banner, s.bannerSuccess]} accessibilityLiveRegion="polite">
              <Icon name="check-circle" size={16} color={theme.success} />
              <Text style={s.bannerTextSuccess}>코드를 다시 보냈어요. 메일함을 확인해 주세요.</Text>
            </View>
          ) : null}

          <TextInput
            style={s.otpInput}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="00000000"
            placeholderTextColor={theme.textFaint}
            editable={!verifying}
            textAlign="center"
            returnKeyType="done"
            onSubmitEditing={handleVerify}
            accessibilityLabel="6자리 인증 코드"
          />

          <Pressable
            style={(st) => [
              s.button,
              (otp.length < 6 || verifying) && s.buttonDisabled,
              webFocusRing((st as PressableState).focused ?? false, theme.text),
            ]}
            onPress={handleVerify}
            disabled={otp.length < 6 || verifying}
            accessibilityRole="button"
          >
            {verifying ? <ActivityIndicator color={theme.onPrimary} /> : null}
            <Text style={s.buttonText}>{verifying ? '인증 중…' : '인증하고 시작하기'}</Text>
          </Pressable>

          <View style={s.linkRow}>
            <Text style={s.linkMuted}>코드를 못 받으셨나요?</Text>
            <Pressable
              onPress={handleResend}
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

        {/* 개인정보 수집·이용 동의(필수) */}
        <View style={s.consentRow}>
          <Pressable
            onPress={() => setAgreed((a) => !a)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="개인정보 수집·이용 동의 (필수)"
            hitSlop={8}
            disabled={submitting}
            style={(st) => [
              s.checkbox,
              agreed && s.checkboxChecked,
              webFocusRing((st as PressableState).focused ?? false, theme.primary),
            ]}
          >
            {agreed ? <Icon name="check" size={14} color={theme.onPrimary} /> : null}
          </Pressable>
          <Text style={s.consentText}>(필수) </Text>
          <Pressable
            onPress={() => setShowPrivacy(true)}
            accessibilityRole="link"
            accessibilityLabel="개인정보 처리방침 보기"
            style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
          >
            <Text style={s.consentLink}>개인정보 처리방침</Text>
          </Pressable>
          <Text style={s.consentText}>에 동의합니다</Text>
        </View>

        <Pressable
          style={(st) => [
            s.button,
            (submitting || !agreed) && s.buttonDisabled,
            webFocusRing((st as PressableState).focused ?? false, theme.text),
          ]}
          onPress={handleSubmit}
          disabled={submitting || !agreed}
          accessibilityRole="button"
          accessibilityState={{ busy: submitting, disabled: submitting || !agreed }}
        >
          {submitting ? <ActivityIndicator color={theme.onPrimary} /> : null}
          <Text style={s.buttonText}>{submitting ? '가입 중…' : '회원가입'}</Text>
        </Pressable>

        <PrivacyModal
          visible={showPrivacy}
          onClose={() => setShowPrivacy(false)}
          onAgree={() => {
            setAgreed(true);
            setShowPrivacy(false);
            setTopError('');
          }}
        />

        <View style={s.linkRow}>
          <Text style={s.linkMuted}>이미 계정이 있으세요?</Text>
          <Pressable
            onPress={onSwitchToLogin}
            accessibilityRole="link"
            disabled={submitting}
            style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
          >
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
