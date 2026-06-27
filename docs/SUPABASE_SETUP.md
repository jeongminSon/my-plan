# Supabase 설정 가이드 (1단계: 인증 인프라)

코드(클라이언트 초기화·AuthContext·AuthGate)는 모두 들어가 있고, 아래만 채우면 활성화됩니다. 미설정 상태에서는 인증이 무해하게 비활성(앱 정상 동작)입니다.

## 1) Supabase 프로젝트 생성
1. https://supabase.com → 프로젝트 생성(리전 가까운 곳).
2. **Project Settings → API** 에서 두 값 확인:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** 키 → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - ⚠️ **service_role** 키는 절대 프런트/`.env`/저장소에 두지 말 것(서버 전용, RLS 우회).

## 2) 환경변수
프로젝트 루트에 `.env` 생성(이미 `.gitignore`에 포함 → 커밋 안 됨):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # anon public 키
```
- 로컬: `npm run web` / `expo start` 재시작 시 주입됨.
- **웹(Netlify) 배포**: anon 키는 공개값이지만 Netlify 비밀 스캐너가 막을 수 있으니, 이미 `netlify.toml`의 `SECRETS_SCAN_OMIT_KEYS`에 추가해두면 됩니다(다음 단계에서 처리).

## 3) DB 스키마 + RLS 적용
1. Supabase 대시보드 → **SQL Editor** → New query.
2. 저장소의 [`supabase/schema.sql`](../supabase/schema.sql) 내용을 붙여넣고 **Run**.
3. **Table Editor → todos** 에서 확인:
   - **RLS = Enabled** (자물쇠 표시)
   - Policies 탭에 `todos_select_own / insert / update / delete` 4개 존재.

## 4) 확인
- `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` 설정 후 앱 실행 시, `SupabaseAuthProvider`가 세션을 복원하고 `onAuthStateChange`를 구독합니다(로그인 UI는 다음 단계).

## 다음 단계(미리보기)
- 로그인/회원가입 화면(UI) + `AuthGate`로 보호
- 기존 Netlify 동기화/구글 로그인 → Supabase로 교체, localStorage 할일 → `todos` 테이블 마이그레이션
