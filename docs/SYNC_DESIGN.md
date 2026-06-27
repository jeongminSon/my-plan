# 실시간 다중기기 동기화 — 설계안 (Later)

| 항목 | 내용 |
|------|------|
| 상태 | **설계만** (미구현). 현재는 Supabase 저장소가 요청 단위로 동작 |
| 목적 | 한 기기의 변경이 다른 기기에 (준)실시간 반영 + 오프라인 내성 |
| 원칙 | 기존 단일기기 동작을 깨지 않는 **점진 적용** |

> 현재도 "기기 A에서 추가 → 기기 B에서 새로고침" 하면 보입니다(클라우드가 단일 소스). 빠진 것은 **자동/실시간 반영**과 **오프라인 변경 큐**입니다. 데이터 모델에는 이미 `updatedAt`/`deletedAt`(톰스톤)/`dirty` 필드와 `SyncStore` 인터페이스가 있어 확장 토대는 마련돼 있습니다.

## 1. 비교: Realtime 구독 vs 폴링

| 기준 | A. Supabase Realtime(Postgres CDC) | B. 폴링(주기적 pull) |
|---|---|---|
| 반영 지연 | 즉시(초 단위) | 폴링 주기(예: 15~30s) |
| 구현 복잡도 | 중(채널 구독·재연결·RLS 연동) | 낮음(타이머 + `updated_at > cursor` 조회) |
| 서버 부하 | 낮음(푸시) | 중(주기적 쿼리, 다기기·다사용자 시 누적) |
| 배터리/네트워크 | WebSocket 상시 연결 | 주기적, 백그라운드 절전 쉬움 |
| 오프라인 복귀 | 끊김 구간은 별도 재동기화 필요 | 다음 폴링에서 자연 복구 |
| 웹/네이티브 | 둘 다 지원(웹 WS, RN WS) | 둘 다 동일 |

**권장**: **B(폴링)로 시작 → A(Realtime)로 강화**.
- 1단계는 폴링이 단순·견고하고 오프라인 복귀가 깔끔. `포그라운드 진입 + N초 주기`로 충분히 "거의 실시간".
- 사용량이 늘고 즉시성이 중요해지면 Realtime 구독을 얹어 지연을 초 단위로.

## 2. 동기화 규칙

### 충돌 해결 — LWW(Last-Write-Wins)
- 비교 키: 행별 `updated_at`(서버 `set_updated_at` 트리거로 갱신, 이미 존재).
- 규칙: `remote.updated_at > local.updated_at` 이면 remote 채택, 아니면 local 우선.
- 한계 명시: 동시 편집 시 한쪽 필드 변경이 덮일 수 있음(필드 단위 머지는 범위 외). 개인용 앱 규모에선 LWW로 충분.

### 톰스톤(삭제 전파)
- 삭제는 물리 삭제가 아닌 `deleted_at` 설정(이미 그렇게 동작). 동기화 시 톰스톤도 함께 내려/올려 다른 기기에서 제거 반영.
- 정리(GC): `deleted_at`이 N일 지난 행은 주기적으로 물리 삭제(서버 크론/Edge Function).

### 오프라인 변경 큐
- 오프라인 중 변경은 로컬에 `dirty=true`로 표시(이미 필드 존재).
- 온라인 복귀 시 `dirty` 행을 서버로 push(upsert, `onConflict=id`) → 성공분 `dirty=false`.
- push와 pull 순서: **pull → 로컬 머지(LWW) → push** 로 덮어쓰기 최소화.

## 3. 커서 기반 증분 동기화
- 사용자별 `last_pulled_at` 커서 저장(기기 로컬).
- pull: `select * from todos where updated_at > :cursor`(RLS로 본인 행만) → 로컬 LWW 머지 → 커서 갱신.
- 최초 1회는 전체, 이후는 증분이라 가볍다.

## 4. 점진 적용 로드맵
1. **M1 — 수동/포그라운드 폴링**: 앱 포그라운드 진입 시 + 당김 새로고침으로 pull(증분). 가장 안전.
2. **M2 — 주기 폴링 + 오프라인 큐**: 타이머 pull + `dirty` push. 네트워크 오류 시 큐 유지.
3. **M3 — Realtime 구독**: `todos`/`lists` 변경 구독으로 지연을 초 단위로. 폴링은 백업(끊김 복구)으로 유지.
4. **M4 — 톰스톤 GC**: 서버 크론으로 오래된 삭제 행 정리.

## 5. 기존 코드 재사용/배선 지점
- `models/Task`·`models/TaskList`의 `updatedAt`/`deletedAt`/`dirty` — 그대로 활용.
- `sync/SyncStore.ts` 인터페이스 — 동기화 엔진이 로컬/원격 저장소를 다루는 포트로 재사용.
- `data/supabaseRepository.ts` — pull/push 쿼리(`updated_at > cursor`, upsert) 추가 지점.
- ⚠️ 기존 `SyncEngine`(레거시 Netlify용)은 **삭제됨** — 새 엔진은 Supabase 기준으로 신규 작성.

## 6. 리스크/주의
- **RLS 일관성**: pull/push/Realtime 모두 RLS로 본인 행만(서버에서 강제됨) — 클라이언트 user_id 스코프와 이중 보호.
- **시계 차이**: `updated_at`은 **서버 시각**(트리거)으로 통일 → 기기 시계 오차로 인한 LWW 오판 방지.
- **중복/재시도**: push는 `upsert(onConflict=id)`로 멱등.
- **배터리**: Realtime 상시 연결은 백그라운드에서 해제, 포그라운드에서 재연결.

---

*지금 단계에서는 구현하지 않는다. 본 문서는 착수 시점의 기준 설계로 사용한다.*
