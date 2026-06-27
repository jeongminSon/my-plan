import { useMemo } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { makeAuthStyles, PressableState, webFocusRing } from './authStyles';

/** 개인정보 처리방침 전문(외부) — 저장소의 docs/PRIVACY.md */
export const PRIVACY_POLICY_URL =
  'https://github.com/jeongminSon/my-plan/blob/main/docs/PRIVACY.md';

const ROWS: { k: string; v: string }[] = [
  {
    k: '수집 항목',
    v: '이메일 주소(필수). 비밀번호는 인증 제공자(Supabase)가 안전하게 처리하며, 앱은 평문으로 보관하지 않습니다.',
  },
  {
    k: '이용 목적',
    v: '회원 식별·인증, 할일·목록 데이터의 클라우드 저장 및 기기 간 동기화.',
  },
  {
    k: '보관 기간',
    v: '회원 탈퇴(계정 삭제) 시까지 보관하며, 탈퇴 시 즉시 파기합니다.',
  },
  {
    k: '파기',
    v: '앱 내 "계정 삭제" 시 서버의 할일/목록 데이터와 인증 계정을 즉시 삭제합니다.',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAgree: () => void;
}

/** 개인정보 수집·이용 동의 상세 모달(수집/목적/보관/파기 + 전문 링크). */
export function PrivacyModal({ visible, onClose, onAgree }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeAuthStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View
          style={s.modalCard}
          accessibilityViewIsModal
          accessibilityLabel="개인정보 수집·이용 동의"
        >
          <Text style={s.title}>개인정보 수집·이용 동의</Text>
          <Text style={s.subtitle}>아래 내용을 확인하고 동의해 주세요.</Text>

          <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled">
            {ROWS.map((r) => (
              <View key={r.k} style={s.privacyRow}>
                <Text style={s.privacyKey}>{r.k}</Text>
                <Text style={s.privacyVal}>{r.v}</Text>
              </View>
            ))}
            <Pressable
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              accessibilityRole="link"
              accessibilityLabel="개인정보 처리방침 전문 보기(새 창)"
              style={(st) => webFocusRing((st as PressableState).focused ?? false, theme.primary)}
            >
              <Text style={s.consentLink}>개인정보 처리방침 전문 보기 ↗</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            onPress={onAgree}
            accessibilityRole="button"
            style={(st) => [s.button, webFocusRing((st as PressableState).focused ?? false, theme.text)]}
          >
            <Text style={s.buttonText}>동의하고 계속</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={(st) => [
              { alignItems: 'center', justifyContent: 'center', minHeight: 40 },
              webFocusRing((st as PressableState).focused ?? false, theme.primary),
            ]}
          >
            <Text style={s.linkMuted}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
