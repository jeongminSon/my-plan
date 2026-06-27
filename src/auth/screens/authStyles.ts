import { Platform, StyleSheet } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { Theme } from '../../theme/theme';

const IS_WEB = Platform.OS === 'web';

/** Pressable의 style 콜백 상태(웹은 focused/hovered 포함 — RN 타입엔 없어 보강). */
export type PressableState = { pressed: boolean; focused?: boolean; hovered?: boolean };

/** 웹 키보드 포커스 링(아웃라인 — 레이아웃에 영향 없음). 네이티브는 무시. */
export function webFocusRing(focused: boolean, color: string): ViewStyle | undefined {
  if (!focused || !IS_WEB) return undefined;
  return {
    outlineColor: color,
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineOffset: 2,
  } as ViewStyle;
}

/** 입력 기본 아웃라인 제거(래퍼에 커스텀 링을 그리므로 중복 방지). */
export const webInputReset: TextStyle = IS_WEB
  ? ({ outlineStyle: 'none' } as unknown as TextStyle)
  : {};

/** 인증 화면 공통 스타일 (모바일 우선, 중앙 단일 컬럼). */
export function makeAuthStyles(t: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 420, gap: 14 },
    title: { fontSize: 26, fontWeight: '800', color: t.text },
    subtitle: { fontSize: 14, color: t.textMuted, marginTop: -6 },
    hint: { fontSize: 13, color: t.textFaint, lineHeight: 18 },
    // 주요 버튼: 가장 높은 대비(브랜드색은 버튼/강조에만)
    button: {
      minHeight: 48,
      borderRadius: 10,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: t.onPrimary, fontSize: 16, fontWeight: '700' },
    // 상단 배너(오류/성공) — 색 + 아이콘 + 문구
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
    bannerError: { backgroundColor: t.dangerBg },
    bannerSuccess: { backgroundColor: t.successBg },
    bannerIconError: { color: t.danger, fontSize: 16 },
    bannerIconSuccess: { color: t.success, fontSize: 16 },
    bannerTextError: { color: t.danger, fontSize: 13, flex: 1, fontWeight: '600' },
    bannerTextSuccess: { color: t.success, fontSize: 13, flex: 1, fontWeight: '600' },
    // 구분선 + 구글 버튼(브랜드 버튼과 구분되는 아웃라인)
    divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border },
    dividerText: { color: t.textFaint, fontSize: 12 },
    googleBtn: {
      minHeight: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.bg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    googleBtnText: { color: t.text, fontSize: 15, fontWeight: '700' },
    // 6자리 코드 입력
    otpInput: {
      minHeight: 56,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.bg,
      color: t.text,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 8,
      paddingHorizontal: 16,
    },
    // 링크
    linkRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    linkMuted: { color: t.textMuted, fontSize: 14 },
    link: { color: t.primary, fontSize: 14, fontWeight: '700' },
    // 비밀번호 강도
    strengthWrap: { gap: 4 },
    strengthBars: { flexDirection: 'row', gap: 4 },
    strengthSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: t.surfaceAlt },
    strengthLabel: { fontSize: 12, color: t.textMuted },
  });
}
