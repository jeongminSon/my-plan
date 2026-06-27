import { Feather } from '@expo/vector-icons';
import { ComponentProps } from 'react';

/** Feather 아이콘 이름(타입 안전) */
export type IconName = ComponentProps<typeof Feather>['name'];

interface Props {
  name: IconName;
  /** 토큰 크기(기본 16) */
  size?: number;
  /** 색은 항상 토큰을 명시(테마 일관성) */
  color: string;
  /** 의미가 있는 아이콘이면 라벨 부여, 없으면 장식(부모 Pressable이 라벨 가짐) */
  label?: string;
}

/**
 * 단일 아이콘 세트(@expo/vector-icons Feather)로 통일.
 * 이모지 대신 크기·색을 토큰으로 통제하고 접근성 라벨을 제어한다.
 */
export function Icon({ name, size = 16, color, label }: Props) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
    />
  );
}
