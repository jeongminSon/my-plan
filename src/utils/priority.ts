import { Priority } from '../models/Task';
import { Theme } from '../theme/theme';

/** 우선순위 순환: 없음 → 높음 → 중간 → 낮음 → 없음. */
export function nextPriority(current: Priority | undefined): Priority | undefined {
  if (current == null) return 'high';
  if (current === 'high') return 'med';
  if (current === 'med') return 'low';
  return undefined;
}

export function priorityLabel(p: Priority): string {
  switch (p) {
    case 'high':
      return '높음';
    case 'med':
      return '중간';
    case 'low':
      return '낮음';
  }
}

/** 테마 색상 매핑 */
export function priorityColor(p: Priority, theme: Theme): string {
  switch (p) {
    case 'high':
      return theme.priorityHigh;
    case 'med':
      return theme.priorityMed;
    case 'low':
      return theme.priorityLow;
  }
}
