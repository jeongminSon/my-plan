# 구글 로그인 설정 가이드

코드는 모두 구현돼 있고, **아래 설정을 채우면 활성화**됩니다. 미설정 상태에서는 구글 로그인 버튼이 숨겨지고 익명 동기화로 동작합니다(앱은 정상).

참고(공식): https://docs.expo.dev/guides/google-authentication/

---

## 1) Google Cloud Console에서 OAuth 클라이언트 ID 발급
https://console.cloud.google.com/ → 프로젝트 생성 → **API 및 서비스 → OAuth 동의 화면** 구성(외부, 앱 이름 my-plan, 테스트 사용자에 본인 이메일 추가).

그다음 **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID** 로 2개 만든다.

### A. 웹 애플리케이션
- 승인된 JavaScript 원본: `https://my-plan-by-son.netlify.app`
- 승인된 리디렉션 URI: `https://my-plan-by-son.netlify.app`
  - (로컬 테스트도 하려면 `http://localhost:8081` 추가)
- → **웹 클라이언트 ID** 획득

### B. Android
- 패키지 이름: `com.jeongminson.myplan`
- SHA-1 인증서 지문: EAS 키스토어의 SHA-1 을 넣는다. 확인 명령:
  ```bash
  npx eas-cli credentials -p android   # Keystore → SHA-1 Fingerprint 확인
  ```
- → **Android 클라이언트 ID** 획득

## 2) 환경변수 설정

### 웹 (Netlify 빌드 환경변수)
Netlify → Site configuration → **Environment variables** 에 추가 후 재배포:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = <웹 클라이언트 ID>
```

### Android (eas.json 또는 빌드 env)
`eas.json`의 `preview.env`에 추가(또는 빌드 시 주입):
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     = <웹 클라이언트 ID>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = <Android 클라이언트 ID>
```

### 서버 (Netlify Function 런타임 환경변수) — 보안 검증용
Netlify → Environment variables 에 추가(쉼표로 여러 개):
```
GOOGLE_ALLOWED_AUDIENCES = <웹 클라이언트 ID>,<Android 클라이언트 ID>
```
> 서버는 이 audience 목록에 맞는 id_token만 신뢰한다(위조 방지).

## 3) 배포/빌드
- **웹**: 환경변수 저장 후 Netlify 재배포 → "구글로 로그인" 버튼이 동기화 패널에 나타남
- **Android**: 네이티브 모듈이라 **새 APK 빌드 필요**
  ```bash
  npx eas-cli build -p android --profile preview
  ```

## 동작 방식 요약
- 로그인하면 같은 구글 계정의 기기끼리 자동 동기화(서버가 `g:<sub>`로 격리).
- 로그아웃하면 익명 코드 동기화로 돌아간다.
- id_token 만료(약 1시간) 시 동기화에서 재로그인을 요청한다(자동 리프레시는 후속 개선 여지).
