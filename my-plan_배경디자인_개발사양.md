# my-plan — 시간대 적응형 전역 배경 디자인 & 개발 사양

| 항목 | 내용 |
|------|------|
| 대상 | my-plan (Expo React Native + Web, react-native-web) |
| 작성일 | 2026-06-28 |
| 범위 | **전 화면 공통 배경** + 라이트/다크 대응 + **시간대(새벽·아침·낮·밤) 적응** |
| 전제 토큰 | 기존 `src/theme/theme.ts`("Calm Focus" 인디고 디자인 시스템) 재사용 |
| 결과물 | 컨셉 → 팔레트(8세트) → 파일 구조 → 단계별 개발 프롬프트 → 검증 |

> 이 문서 하나로 **배경 기능을 처음부터 끝까지** 개발할 수 있게 정리했습니다. 각 단계의 회색 블록은 클로드코드에 그대로 붙여 쓰는 프롬프트입니다.

---

## 1. 목표

- 로그인 화면뿐 아니라 **모든 화면이 같은 배경**을 공유한다(일관된 정체성).
- **라이트/다크 모드 모두** 자연스럽게 동작한다.
- **시간대(새벽/아침/낮/밤)에 따라 배경의 색온도**가 은은히 바뀐다.
- **콘텐츠 가독성과 브랜드/상태색은 절대 손대지 않는다.**

---

## 2. 디자인 컨셉 — "Calm Morning, 하루의 흐름"

할일 앱은 하루를 정리하는 도구다. 배경도 **하루의 시간 흐름**을 닮게 한다. 큰 면적은 중립으로 비우고(텍스트 가독성 보존), 인디고 브랜드는 **주변부에 은은히 고이는 빛(오브)** 과 워시에만 쓴다. 시간이 흐르면 그 빛의 색온도만 새벽→아침→낮→밤으로 바뀐다.

### 핵심 원칙 (트레이드오프 명시)

로그인 화면은 비어 있어 배경을 살릴 수 있지만, **메인 할일 화면은 정보가 빽빽**하다(히어로·통계·리스트). 배경이 세면 스캔성이 떨어진다. 그래서:

> **시간대는 "큰 면"을 칠하지 않는다. "주변부 빛(오브)·워시의 색온도"만 바꾼다. 콘텐츠는 항상 불투명 카드 위에 둔다.**

이 원칙으로 텍스트 대비·브랜드 의미는 고정한 채 분위기만 시간에 따라 흐른다. 메인 화면은 배경 강도를 약 40% 낮춰(`intensity='subtle'`) 리스트 가독성을 지킨다.

---

## 3. 시간대 정의

| 시간대 | 코드 | 시간 범위 | 무드 |
|--------|------|-----------|------|
| 새벽 | `dawn` | 05:00–07:59 | 라벤더-인디고, 고요 |
| 아침 | `morning` | 08:00–11:59 | 청량 + 옅은 온기, 시작 |
| 낮 | `day` | 12:00–17:59 | 맑은 인디고, 집중(기본) |
| 밤 | `night` | 18:00–04:59 | 깊은 인디고, 차분 |

---

## 4. 팔레트 — 라이트/다크 × 4시간대 (8세트)

브랜드 인디고(`#3B5BDB`)와 어울리는 톤만 골랐다. **이 색들은 배경 장식(워시·오브·외곽선)에만** 쓰고, 텍스트·카드·브랜드·상태색 토큰은 건드리지 않는다. 값은 **근사값**이며, 적용 후 8조합을 보며 미세 조정한다(*confirm against final tuning*).

### 라이트 모드

| 시간대 | wash(상단 워시) | orb1(주 오브) | orb2(보조 오브) | outline(외곽선 모티프) |
|--------|------|------|------|------|
| 새벽 | `#ECEAFB` | `#DCD9F5` | `#E6E3F7` | `#D5D2F2` |
| 아침 | `#E8F1FC` | `#DCE9F8` | `#FCEEE6`(옅은 살구) | `#D8E6F8` |
| 낮 | `#EEF1FE` | `#E0E4FB` | `#E9ECFE` | `#D8DFFB` |
| 밤 | `#E6E7F2` | `#DBDCEC` | `#E1E2EF` | `#D2D4E6` |

### 다크 모드 (베이스 `bg #15171c`)

| 시간대 | wash | orb1 | orb2 | outline |
|--------|------|------|------|------|
| 새벽 | `#1C1B2B` | `#241F3A` | `#1F1D30` | `#2E2A45` |
| 아침 | `#181C24` | `#1B2740` | `#211E1A`(미세 온기) | `#243047` |
| 낮 | `#171A22` | `#20283F` | `#1B2030` | `#2E3A5C` |
| 밤 | `#15171F` | `#1E2233` | `#191B27` | `#262B3D` |

### 불투명도 가이드

- 라이트: 워시 밴드 ~0.5, 오브 0.6–0.8(이미 옅은 색), 외곽선 0.4–0.5.
- 다크: 위 값의 약 70%(과하지 않게).
- 메인 화면(`intensity='subtle'`): 위 전체에 추가로 ~0.6 배.

> **브랜드 렌즈 주의**: 아침의 옅은 살구(`#FCEEE6`)는 기능색(우선순위 주황·위험 빨강)에 근접한다. 반드시 **주변부 오브에만, 아주 낮은 불투명도**로 쓰고 상태 UI 근처에 두지 않는다.

---

## 5. 파일 구조

| 파일 | 역할 |
|------|------|
| `src/theme/timeOfDay.ts` | 현재 시각 → 시간대 판정 (순수 함수, 테스트 대상) |
| `src/theme/timeOfDay.test.ts` | 경계값 단위 테스트 |
| `src/theme/backgrounds.ts` | 라이트/다크 × 4시간대 = 8세트 색 토큰 + 선택 함수 |
| `src/components/AppBackground.tsx` | 전역 장식 배경 컴포넌트(워시·오브·외곽선 레이어) |
| `App.tsx`(수정) | 모든 화면을 `<AppBackground>`로 감싸기 |
| `src/screens/TaskListScreen.tsx`(수정) | container 배경 `transparent` |
| `src/auth/screens/authStyles.ts`(수정) | `screen` 배경색 제거 |

설계 의도: 시간 판정은 **순수 함수로 분리**(날짜 mock 테스트 가능 — 하드코딩 금지), 색은 **토큰 1곳**(`backgrounds.ts`)에 모아 한 번에 조정, 적용은 **루트 1곳**에서 전 화면 공통.

---

## 6. 단계별 개발 프롬프트

순서대로 진행하고, 각 단계 끝에서 `npm test`·`tsc`가 통과해야 다음으로 넘어간다.

### 1단계 — 시간대 유틸 (순수 함수 + 테스트)

```
src/theme/timeOfDay.ts 를 만들어줘. 시간대 적응 배경의 토대다.
- export type TimeOfDay = 'dawn' | 'morning' | 'day' | 'night'
- export function timeOfDay(date: Date): TimeOfDay
  - 05:00–07:59 dawn / 08:00–11:59 morning / 12:00–17:59 day / 18:00–04:59 night
- 반드시 인자로 받은 date의 getHours() 기준(하드코딩·전역 Date 직접 호출 금지 — 테스트 mock 대응)

이어서 src/theme/timeOfDay.test.ts 를 작성:
- 경계값(05,08,12,18시), 자정 직후(00시=night), 04:59=night, 23:59=night, 07:59=dawn 등
- 기존 테스트 스타일(순수)에 맞춰. 전체 테스트 통과 확인.
```

### 2단계 — 배경 색 토큰

```
src/theme/backgrounds.ts 를 만들어줘.
- 타입: interface BgSet { wash: string; orb1: string; orb2: string; outline: string }
- 라이트/다크 × 4시간대 = 8세트를 사양서 '4. 팔레트' 표의 값으로 정의.
- export function backgroundSet(mode: 'light'|'dark', tod: TimeOfDay): BgSet
- 불투명도는 색에 섞지 말고 컴포넌트에서 opacity로 제어(토큰은 베이스 색만).
tsc 통과 확인. (이 단계는 화면 변경 없음)
```

### 3단계 — AppBackground 컴포넌트

```
src/components/AppBackground.tsx 를 만들어줘. 자식 위에 깔리는 전역 장식 배경이야.
- props: { children: ReactNode; intensity?: 'full' | 'subtle' }  // 기본 'full'
- 현재 테마(useTheme)와 timeOfDay(new Date())로 backgroundSet을 고른다.
- 레이어(뒤→앞, 모두 position:absolute + pointerEvents="none" + 스크린리더 무시):
  1) 베이스: theme.bg 전체
  2) 상단 워시: 화면 상단 40~50% 높이, set.wash 톤이 아래로 사라지는 그라데이션
     - expo-linear-gradient 권장(colors=[set.wash, theme.bg]). 미설치 시 반투명 View 밴드 폴백.
  3) 소프트 오브 2개: borderRadius 9999 큰 원
     - 좌상단 set.orb1(화면 밖 일부 걸침), 우하단 set.orb2
  4) 외곽선 모티프: 옅은 원 + 살짝 회전한 라운드 사각, 색 set.outline
- intensity='subtle'이면 워시/오브/외곽선 전체 불투명도를 ~0.6배로 낮춘다(메인 화면용).
- 다크 모드에서는 불투명도를 추가로 ~0.7배.
- 그 위에 children 렌더.
먼저 레이어 구조와 불투명도 값을 제안하고, 확인 후 구현. tsc 통과 확인.
```

### 4단계 — 전역 적용

```
AppBackground를 모든 화면에 적용해줘.
- App.tsx ThemedRoot의 SafeAreaView 안쪽, AuthGate/AppData를 <AppBackground>로 감싼다.
  - 인증 화면(AuthGate fallback) 경로는 intensity='full'
  - 메인 화면(AppData/TaskListScreen) 경로는 intensity='subtle'
  - (구조상 한 번만 감싸야 하면 현재 화면 종류에 따라 intensity를 전달)
- 배경이 보이도록:
  - src/screens/TaskListScreen.tsx 의 container backgroundColor를 'transparent'로
  - src/auth/screens/authStyles.ts 의 screen 에서 backgroundColor 제거
- 가독성 보존(필수): 카드·리스트 행은 불투명 유지.
  heroCard, 통계/토글, TaskItem.wrap, 메타 칩, 인증 카드(card) 등은 theme.surface/bg 솔리드 그대로 둔다.
  (배경은 헤더 여백·카드 사이·빈 영역으로만 은은히 비친다)
적용 후 라이트/다크에서 메인·로그인 화면이 깨지지 않는지 확인. tsc/jest 통과 확인.
```

### 5단계 — 시간 변화 반영 + 모션/접근성

```
배경이 시간 경계를 넘을 때 갱신되게 하고 접근성을 마감하자.
1) 앱 시작 시 timeOfDay 계산. 추가로 AppState가 'active'로 복귀할 때 재계산해
   시간대가 바뀌었으면 배경을 갱신(상태로 관리).
2) 시간대 전환 시 부드러운 크로스페이드(150~300ms).
   단 prefers-reduced-motion(웹)·AccessibilityInfo.isReduceMotionEnabled(네이티브)에서는
   애니메이션을 끄고 즉시 전환.
3) 접근성: 본문/입력 텍스트 대비 AA(4.5:1) 유지 — 배경 때문에 떨어지면 불투명도를 낮춘다.
   상태색(위험/성공/우선순위)·브랜드 의미는 고정.
4) CSP: 인라인 스크립트 추가 금지(현 netlify.toml은 script-src 'self'만 허용). 스타일/그라데이션 레이어만.
변경 후 build:web + tsc + jest 통과 확인.
```

---

## 7. 접근성 · 품질 체크리스트 (출고 전)

- [ ] 라이트/다크 × 4시간대 = **8조합** 모두에서 카드·리스트 텍스트 대비 AA(4.5:1) 유지
- [ ] 모든 인터랙티브 요소의 `:focus-visible` 포커스 링이 배경 위에서도 보임
- [ ] 배경 오브/워시가 입력·체크박스·리스트 **탭을 막지 않음**(pointerEvents="none")
- [ ] 상태색(위험·성공·우선순위)과 브랜드 의미가 시간대 색에 묻히지 않음
- [ ] 메인 화면 리스트 스캔성이 배경으로 저하되지 않음(`intensity='subtle'` 적용)
- [ ] reduced-motion에서 시간대 전환 애니메이션 비활성
- [ ] `timeOfDay` 경계값 테스트 통과(05/08/12/18/00/23:59)
- [ ] `build:web`·`tsc`·`jest` 통과, 회귀 없음

---

## 8. 검증 (마무리 보고 형식)

구현 후 **변경 전후를 4렌즈로 한 줄씩** 요약 보고한다.

- **브랜드**: 인디고를 주변부 빛에만 — 시간대로 색온도 변주, 큰 면은 중립 유지.
- **일관성·접근성**: 전 화면 공통 배경 + AA 대비·포커스 링 보존, 토큰 1곳 관리.
- **밀도·스캔성**: 메인은 `subtle`로 배경 약화 → 리스트 가독성 유지.
- **즉시 인지**: 콘텐츠는 항상 불투명 카드 위 → "지금 할 일"이 배경에 묻히지 않음.

---

*팔레트 색은 근사값입니다. 적용 후 라이트/다크 8조합을 실제로 보면서 워시/오브 불투명도와 색을 미세 조정하세요. expo-linear-gradient는 Expo 공식·웹 호환이라 워시를 매끈하게 내려면 추가를 권장하며, 의존성을 늘리기 싫으면 반투명 View 밴드 폴백으로도 구현됩니다.*
