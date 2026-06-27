import { Platform } from 'react-native';

let injected = false;

/**
 * 웹 전용 글로벌 접근성 스타일을 1회 주입.
 * - :focus-visible 포커스 링(키보드 사용자에게만 표시) — 모든 인터랙티브 요소
 * - prefers-reduced-motion: 애니메이션/트랜지션 축소
 * CSP: style-src 'unsafe-inline' 허용 범위 내(인라인 <style> 주입).
 */
export function injectWebA11yStyles(): void {
  if (Platform.OS !== 'web' || injected || typeof document === 'undefined') return;
  injected = true;
  const css = `
    :root { --brand: #3B5BDB; }
    a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible,
    select:focus-visible, [role="button"]:focus-visible, [role="checkbox"]:focus-visible,
    [role="link"]:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--brand);
      outline-offset: 2px;
      border-radius: 6px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;
  const el = document.createElement('style');
  el.setAttribute('data-myplan-a11y', '');
  el.textContent = css;
  document.head.appendChild(el);
}

/** 포커스 링 색을 현재 테마 브랜드색에 동기화(라이트/다크 대응). */
export function setBrandVar(color: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--brand', color);
}
