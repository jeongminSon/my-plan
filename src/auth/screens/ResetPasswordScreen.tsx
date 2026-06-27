import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { sendPasswordReset } from '../passwordReset';
import { isValidEmail, MESSAGES } from '../validation';
import { AuthField } from './AuthField';
import { makeAuthStyles, PressableState, webFocusRing } from './authStyles';

interface Props {
  onSwitchToLogin: () => void;
}

/** 비밀번호 재설정 메일 요청 화면. 열거 방지: 존재 여부와 무관하게 "보냈다"고 안내. */
export function ResetPasswordScreen({ onSwitchToLogin }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeAuthStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (submitting) return;
    setError('');
    if (!isValidEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    setSubmitting(true);
    const r = await sendPasswordReset(email);
    setSubmitting(false);
    if (r.networkError) {
      setError(MESSAGES.network);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.title}>메일을 보냈어요</Text>
          <View style={[s.banner, s.bannerSuccess]} accessibilityLiveRegion="polite">
            <Icon name="check-circle" size={16} color={theme.success} />
            <Text style={s.bannerTextSuccess}>
              {email.trim()} 으로 비밀번호 재설정 링크를 보냈어요. 메일의 링크를 열어 새 비밀번호를 설정하세요.
            </Text>
          </View>
          <Text style={s.hint}>메일이 오지 않으면 스팸함도 확인해 주세요.</Text>
          <Pressable
            style={(st) => [s.button, webFocusRing((st as PressableState).focused ?? false, theme.text)]}
            onPress={onSwitchToLogin}
            accessibilityRole="button"
          >
            <Text style={s.buttonText}>로그인으로</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Text style={s.title}>비밀번호 찾기</Text>
        <Text style={s.subtitle}>가입한 이메일로 재설정 링크를 보내드려요.</Text>

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
          <Text style={s.buttonText}>{submitting ? '보내는 중…' : '재설정 메일 보내기'}</Text>
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
