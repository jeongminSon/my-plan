import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { backgroundSet } from '../theme/backgrounds';
import { useTheme } from '../theme/ThemeContext';
import { timeOfDay } from '../theme/timeOfDay';

interface Props {
  children: ReactNode;
  /** 'full'=인증 등 빈 화면, 'subtle'=정보 밀집 메인 화면(배경 약화) */
  intensity?: 'full' | 'subtle';
  /** 시간 주입(테스트/AppState 복귀 시 재계산용). 미지정 시 현재 시각. */
  now?: Date;
}

/**
 * 전 화면 공통 장식 배경 — 시간대(새벽/아침/낮/밤)에 따라 주변부 빛의 색온도만 바뀐다.
 * 큰 면은 중립(theme.bg)으로 비우고, 워시/오브/외곽선만 은은히. 콘텐츠 가독성·상태색은 불변.
 * 장식 레이어는 전부 pointerEvents="none" + 스크린리더에서 숨김.
 */
export function AppBackground({ children, intensity = 'full', now }: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  const set = useMemo(
    () => backgroundSet(theme.mode, timeOfDay(now ?? new Date())),
    [theme.mode, now]
  );

  // 시간대/모드 전환 시 부드러운 페이드인(reduced-motion에서는 즉시)
  const fade = useRef(new Animated.Value(1)).current;
  const reduceMotion = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduceMotion.current = v;
    });
  }, []);
  useEffect(() => {
    if (reduceMotion.current) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [set, fade]);

  // 불투명도 배율: subtle(메인) 0.6, 다크 0.7 추가
  const k = (intensity === 'subtle' ? 0.6 : 1) * (theme.mode === 'dark' ? 0.7 : 1);
  const op = (base: number) => Math.round(base * k * 100) / 100;
  const orb = Math.max(width, 320) * 0.9;

  return (
    <View style={styles.root}>
      {/* 베이스(페이드 영향 없이 항상 불투명) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} pointerEvents="none" />
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: fade }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* 2) 상단 워시(아래로 사라짐) */}
        <LinearGradient
          colors={[set.wash, theme.bg]}
          style={[styles.wash, { height: height * 0.5, opacity: op(0.5) }]}
        />
        {/* 3) 소프트 오브 2개 */}
        <View
          style={[
            styles.orb,
            { width: orb, height: orb, borderRadius: orb, backgroundColor: set.orb1, top: -orb * 0.35, left: -orb * 0.3, opacity: op(0.7) },
          ]}
        />
        <View
          style={[
            styles.orb,
            { width: orb, height: orb, borderRadius: orb, backgroundColor: set.orb2, bottom: -orb * 0.4, right: -orb * 0.3, opacity: op(0.6) },
          ]}
        />
        {/* 4) 외곽선 모티프 */}
        <View style={[styles.ring, { borderColor: set.outline, opacity: op(0.5), top: height * 0.18, right: -40 }]} />
        <View style={[styles.roundSquare, { borderColor: set.outline, opacity: op(0.45), bottom: height * 0.22, left: -30 }]} />
      </Animated.View>

      {/* 콘텐츠(불투명 카드/리스트는 각 화면에서 솔리드 유지) */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  wash: { position: 'absolute', top: 0, left: 0, right: 0 },
  orb: { position: 'absolute' },
  ring: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2 },
  roundSquare: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 28,
    borderWidth: 2,
    transform: [{ rotate: '12deg' }],
  },
});
