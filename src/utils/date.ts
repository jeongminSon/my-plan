/**
 * 날짜 유틸 (순수 함수 — UI/저장소와 독립적이라 단위 테스트가 쉽다)
 *
 * 모든 시각은 epoch ms(number)로 다룬다.
 * 마감일은 "그 날 끝(23:59:59.999)"으로 저장한다 → 당일에는 '지남'으로 보이지 않는다.
 */

/** epoch ms 를 "YYYY-MM-DD" 문자열로 변환한다. */
export function formatDate(epochMs: number): string {
  const d = new Date(epochMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 해당 날짜의 0시 0분 0초(로컬). */
export function startOfDay(epochMs: number): number {
  const d = new Date(epochMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 해당 날짜의 끝(23:59:59.999, 로컬). */
export function endOfDay(epochMs: number): number {
  const d = new Date(epochMs);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** n일 더한 시각(로컬 기준, DST 안전). */
export function addDays(epochMs: number, days: number): number {
  const d = new Date(epochMs);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** n개월 더한 시각(로컬 기준). */
export function addMonths(epochMs: number, months: number): number {
  const d = new Date(epochMs);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

/** target이 now와 며칠 차이인지(날짜 단위, 음수=과거). */
export function dayDiff(now: number, target: number): number {
  const ms = startOfDay(target) - startOfDay(now);
  return Math.round(ms / 86_400_000);
}

/** dueDate가 '오늘'인가? */
export function isToday(dueDate: number | undefined, now: number): boolean {
  if (dueDate == null) return false;
  return startOfDay(dueDate) === startOfDay(now);
}

/**
 * 마감일이 지났는지 판단한다(완료되지 않은 할일의 강조용).
 * dueDate가 없으면 false.
 */
export function isOverdue(dueDate: number | undefined, now: number): boolean {
  if (dueDate == null) return false;
  return dueDate < now;
}

/** 마감일 칩에 표시할 라벨. */
export function dueDateLabel(dueDate: number, now: number): string {
  const off = dayDiff(now, dueDate);
  if (off === 0) return '오늘';
  if (off === 1) return '내일';
  if (off === 2) return '모레';
  if (off === -1) return '어제';
  // 그 외에는 MM/DD 로 표기
  return formatDate(dueDate).slice(5).replace('-', '/');
}

/**
 * 마감일 순환: 미지정 → 오늘 → 내일 → 모레 → 미지정.
 * (과거 날짜는 다음 탭에서 '내일'로 이동)
 */
export function nextDueDate(current: number | undefined, now: number): number | undefined {
  if (current == null) return endOfDay(now); // 미지정 → 오늘
  const off = dayDiff(now, current);
  if (off <= 0) return endOfDay(addDays(now, 1)); // 오늘/지남 → 내일
  if (off === 1) return endOfDay(addDays(now, 2)); // 내일 → 모레
  return undefined; // 모레 이후 → 미지정
}
