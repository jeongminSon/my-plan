# my-plan — 개인용 할일 관리 앱

React Native + Expo 기반의 개인용 할일(To-Do) 관리 앱. iOS / Android 를 동시에 지원하며,
데이터는 기기 로컬(SQLite)에 저장되어 앱을 껐다 켜도 유지된다.

## 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | React Native + Expo (SDK 56) | iOS/Android 동시 지원, 네이티브 빌드 설정 부담 최소화 |
| 언어 | TypeScript | 데이터 모델 타입 안정성 |
| 로컬 저장 | `expo-sqlite` (네이티브) / `localStorage` (웹) | 정렬/필터 쿼리에 유리한 영구 저장소 |
| 알림 | `expo-notifications` (네이티브) / `Notification` API (웹) | 로컬 리마인더(푸시 토큰·네트워크 없음) |
| 테스트 | Jest (`jest-expo` preset) | 저장소·도메인 로직을 화면과 분리해 단위 테스트 |

### 추가한 외부 라이브러리 (꼭 필요한 것만)

- **expo-sqlite** — 로컬 영구 저장 (앱 재시작 후에도 데이터 유지)
- **expo-notifications** — 알림(리마인더) 로컬 예약. **푸시 토큰을 발급하지 않고 네트워크 전송도 없다** — 권한은 오직 알림 표시 목적에만 사용
- **react-dom / react-native-web / @expo/metro-runtime** — 웹 실행 지원
- **jest / jest-expo / @types/jest** (dev 전용) — 단위 테스트

> 네비게이션·상태관리 라이브러리(react-navigation, redux 등)는 단일 화면이라 추가하지 않았다.
> ID는 외부 UUID 라이브러리 대신 `src/utils/id.ts`의 경량 생성기를 사용한다.
> 마감일·반복·알림 시각은 별도 날짜/시간 선택 라이브러리 없이 **탭 순환 칩**으로 설정한다(의존성 최소화).

## 실행 방법

### 사전 준비
- Node.js 18+ (개발 환경: v24)
- iOS 시뮬레이터(macOS) 또는 Android 에뮬레이터, 혹은 실제 기기 + **Expo Go** 앱

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm start          # Expo 개발 서버 (QR 코드 → Expo Go 로 실행)
npm run ios        # iOS 시뮬레이터에서 실행 (macOS 필요)
npm run android    # Android 에뮬레이터/기기에서 실행
npm run web        # 웹 브라우저에서 실행
```
> 실제 기기에서 가장 빠르게 보려면 `npm start` 후 나오는 QR 코드를 **Expo Go** 앱으로 스캔한다.

### 테스트
```bash
npm test           # 저장소 로직 단위 테스트 (Jest)
npx tsc --noEmit   # 타입 체크
```

## 폴더 구조

기능별로 **화면 / 데이터(저장소) / 컴포넌트 / 유틸**을 분리했다.

```
my-plan/
├── App.tsx                       # 진입점: 저장소를 화면에 주입
├── index.ts                      # Expo 등록 엔트리
├── app.json                      # Expo 설정
├── tsconfig.json
├── package.json
└── src/
    ├── models/
    │   ├── Task.ts               # Task 모델 (마감/목록/반복/알림 필드 포함)
    │   └── TaskList.ts           # 목록(프로젝트) 모델
    ├── data/                     # 저장소 계층 (화면과 분리, 테스트 대상)
    │   ├── taskRepository.ts     # 인터페이스 + 순수 로직 + InMemory 구현
    │   ├── taskRepository.test.ts# 단위 테스트
    │   ├── db.ts                 # Sqlite 구현 (네이티브, 컬럼 추가 마이그레이션)
    │   └── db.web.ts             # localStorage 구현 (웹)
    ├── services/                 # 부수효과 경계 (알림)
    │   ├── NotificationService.ts# 알림 서비스 인터페이스
    │   ├── notifications.ts      # 네이티브 구현 (expo-notifications)
    │   ├── notifications.web.ts  # 웹 구현 (Notification API)
    │   └── reminderCoordinator.ts# 권한→예약→저장 조율 (테스트 대상)
    ├── screens/
    │   └── TaskListScreen.tsx    # 메인 화면 (오늘 보기/목록 필터/카운트)
    ├── components/
    │   ├── TaskItem.tsx          # 할일 한 줄 (완료/마감/목록/반복/알림 칩)
    │   └── ListBar.tsx           # 목록 필터 칩 + 관리 패널
    └── utils/                    # 순수 함수 (전부 단위 테스트)
        ├── date.ts               # 날짜/마감 계산
        ├── todayView.ts          # 오늘 보기 필터·정렬·카운트
        ├── lists.ts              # 목록 순환
        ├── repeat.ts             # 반복 주기 계산
        ├── reminder.ts           # 알림 시각 계산
        └── id.ts                 # 고유 ID 생성
```
> 플랫폼별 파일(`db.web.ts`, `notifications.web.ts`)은 Metro가 자동 선택한다 —
> 웹은 `localStorage`/`Notification`, 네이티브는 `expo-sqlite`/`expo-notifications`.

## 설계 원칙

### 1. 저장소와 화면 분리 (테스트 가능)
화면은 구체 구현(SQLite)이 아니라 **`TaskRepository` 인터페이스**에만 의존한다.
- `SqliteTaskRepository` — 앱 런타임용 (expo-sqlite)
- `InMemoryTaskRepository` — 단위 테스트/폴백용 (네이티브 모듈 불필요)

두 구현이 동일한 계약을 만족하므로, 핵심 로직(정렬·완료·반복 생성·목록·알림 조율 등)을
네이티브 모듈 없이 순수 TypeScript로 테스트한다. (`npm test` → 49개 통과)

### 2. 데이터 모델 (Task)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 고유 ID |
| `title` | string | 제목 (필수) |
| `memo` | string? | 메모 (선택) |
| `dueDate` | number? | 마감일 (epoch ms, 선택) |
| `completed` | boolean | 완료 여부 |
| `createdAt` | number | 생성일시 (epoch ms) |
| `sortOrder` | number | 정렬 순서 (오름차순) |

> 날짜는 모두 epoch milliseconds(정수)로 저장한다 — SQLite 저장·정렬·타임존 처리에 유리하다.
> SQLite에는 boolean이 없어 `completed`는 0/1 정수로 저장하고 매핑 계층에서 변환한다.

### 3. 영구 저장
앱 시작 시 `repository.init()`이 `tasks` 테이블을 생성(`CREATE TABLE IF NOT EXISTS`)하고,
이후 추가/수정/삭제가 즉시 SQLite에 반영되어 앱을 재시작해도 데이터가 유지된다.

## 현재 기능
**MVP**
- 빠른 추가(자동 포커스, 제목만으로 등록) / 완료 토글 / 길게 눌러 삭제
- 오늘 보기(기본): 마감이 오늘·지남·미지정인 할일 노출, 마감 임박 순 정렬
- "오늘 N개 중 M개 완료" 카운트
- 마감일 설정(탭 순환 칩), 로컬 영구 저장

**정착 기능**
- **목록/프로젝트**: 목록 추가·이름변경·삭제, 할일 이동, 목록별 필터(오늘 보기·카운트는 그대로 동작)
- **반복 할일**: 매일/매주/매월. 완료하면 다음 주기 할일이 자동 생성
- **알림(리마인더)**: 알림 시각 지정 → 그 시각에 로컬 알림 1회. 권한 요청 흐름 포함, 푸시 토큰·네트워크 없음

**차별화 기능**
- **우선순위 + 색상**: 높음/중간/낮음, 좌측 색상 액센트로 빠른 식별
- **하위 할일(체크리스트)**: 할일을 펼쳐 세부 항목 추가/완료/삭제, `n/m` 진행 표시
- **진행 통계**: 오늘 완료율(진행바) + 이번 주 완료 수
- **다크 모드**: 시스템/라이트/다크 선택
- **안정성**: 크래시 ErrorBoundary + 로컬 오류 로깅, 저장소 초기화 실패 시 재시도 화면

> 알림 동작 차이(정직하게): 네이티브는 OS가 예약을 관리해 앱이 꺼져 있어도 전달된다.
> 웹은 서비스워커 없이 `setTimeout`으로 예약하므로 탭이 열려 있는 동안에만 동작한다.

> 동기화(클라우드)는 설계·로컬 준비(S1)까지 완료, 백엔드 연결은 다음 증분. 자세한 내용은 개인정보 처리방침 참고.

## 빌드 · 배포

### 사전 준비
- Expo 계정 + EAS CLI: `npm install -g eas-cli && eas login`
- 앱 아이콘/스플래시: `assets/`의 기본 이미지를 실제 브랜드 에셋으로 교체(스토어 제출 전 필수)

### 개발 빌드 / 미리보기
```bash
npx expo start                 # 개발 서버 (Expo Go)
eas build --profile preview    # 내부 테스트용 빌드(APK/시뮬레이터)
```

### 스토어 제출 빌드
```bash
eas build --platform android   # Android (AAB)
eas build --platform ios       # iOS (macOS·Apple Developer 계정 필요)
eas submit --platform android  # Play Store 제출
eas submit --platform ios      # App Store 제출
```
> 알림(`expo-notifications`)·DB(`expo-sqlite`)는 네이티브 모듈이라 **개발 빌드/스토어 빌드**에서 동작한다. Expo Go에서는 로컬 알림에 제약이 있을 수 있다.

### 품질 게이트(배포 전 실행)
```bash
npx tsc --noEmit   # 타입 체크
npm test           # 단위 테스트 (59개)
npx expo export --platform web   # 번들 무결성 확인
```

### 문서
- 개인정보 처리방침: [`docs/PRIVACY.md`](docs/PRIVACY.md) — 배포 시 호스팅 URL로 게시
- 스토어 등록 정보: [`docs/STORE.md`](docs/STORE.md)

## 향후 확장 여지
- 클라우드 동기화 백엔드 연결(S2~), 정확한 날짜/시간 선택 UI
- 드래그로 순서 변경, 위젯, 호스팅 크래시 리포팅(도입 시 데이터 전송 항목 사전 고지)
