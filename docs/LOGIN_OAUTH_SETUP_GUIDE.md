# AutoVideo OAuth 로그인 설정 가이드

이 문서는 **개발을 시작하기 전에**, 네가 직접 해야 하는 **외부 콘솔 설정 / 환경변수 설정 작업만** 정리한 가이드다.

대상 로그인:
- Google
- Naver
- Kakao

현재 프로젝트 기준:
- 로그인 로직은 이미 코드에 들어가 있음
- 네가 해야 하는 일은 **OAuth 앱 생성 + Redirect URI 등록 + 환경변수 입력**이 핵심

관련 코드 위치:
- Provider 설정: `src/auth.ts`
- Auth 라우트: `src/app/api/auth/[...nextauth]/route.ts`
- 로그인 UI: `src/app/page.tsx`

---

## 1. 먼저 알아야 하는 핵심

이 프로젝트는 Auth.js / NextAuth 기반이다.

공식 Auth.js 문서는 보통 아래 환경변수 이름을 권장한다.

```env
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_NAVER_ID
AUTH_NAVER_SECRET
AUTH_KAKAO_ID
AUTH_KAKAO_SECRET
```

하지만 **현재 이 프로젝트 코드는 아래 이름을 직접 읽고 있다.**

```env
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

NAVER_CLIENT_ID
NAVER_CLIENT_SECRET

KAKAO_CLIENT_ID
KAKAO_CLIENT_SECRET

AUTH_SECRET
```

즉, **지금은 공식 문서 이름이 아니라 프로젝트 코드 기준 이름으로 넣어야 한다.**

---

## 2. 준비해야 하는 환경변수

로컬/배포 환경에 아래 값이 필요하다.

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

AUTH_SECRET=
```

배포 환경에 따라 추가로 필요할 수 있는 값:

```env
AUTH_TRUST_HOST=true
AUTH_URL=https://YOUR_DOMAIN
```

공식 참고:
- Auth.js Deployment: https://authjs.dev/getting-started/deployment
- Auth.js OAuth: https://authjs.dev/getting-started/authentication/oauth

`AUTH_SECRET` 생성 참고:
- 공식 문서: https://authjs.dev/getting-started/deployment#auth_secret
- 명령:

```bash
npm exec auth secret
```

권장 사항:
- `AUTH_SECRET`은 충분히 긴 랜덤 문자열 사용
- 로컬과 운영 환경 모두 직접 넣기
- 운영에서는 fallback 문자열에 의존하지 않기

---

## 3. Redirect URI 규칙

이 프로젝트의 callback URL 형식은 아래와 같다.

### 로컬

- Google: `http://localhost:3000/api/auth/callback/google`
- Naver: `http://localhost:3000/api/auth/callback/naver`
- Kakao: `http://localhost:3000/api/auth/callback/kakao`

### 운영

- Google: `https://YOUR_DOMAIN/api/auth/callback/google`
- Naver: `https://YOUR_DOMAIN/api/auth/callback/naver`
- Kakao: `https://YOUR_DOMAIN/api/auth/callback/kakao`

주의:
- provider 콘솔에 등록하는 값은 **한 글자도 틀리면 안 됨**
- `http` / `https` 다르면 실패
- 도메인 다르면 실패
- path 다르면 실패
- 마지막 slash 차이도 문제될 수 있음

---

## 4. 공통 작업 순서

아래 순서대로 진행하면 된다.

1. Google OAuth 앱 생성
2. Naver OAuth 앱 생성
3. Kakao OAuth 앱 생성
4. 각 provider의 Client ID / Secret 확보
5. `.env.local`에 입력
6. 배포 플랫폼 환경변수에도 동일하게 입력
7. 로컬 callback URL / 운영 callback URL 등록 상태 재확인

추천 순서:
- Google -> Naver -> Kakao

이유:
- Google이 가장 설정 흐름이 일반적이라 기준 잡기 쉬움
- Naver/Kakao는 콘솔 UI와 검수/권한 조건이 더 까다로운 편

---

## 5. Google 로그인 설정

### 공식 문서

- Auth.js Google Provider: https://authjs.dev/getting-started/providers/google
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Google Web Server OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Google Cloud OAuth Client 관리: https://console.cloud.google.com/apis/credentials
- Google OAuth Client 도움말: https://support.google.com/cloud/answer/15549257?hl=en

### 네가 해야 하는 일

1. Google Cloud Console에 로그인
2. 프로젝트 생성
3. OAuth Consent Screen 설정
4. OAuth Client 생성
5. 앱 유형을 **Web application**으로 선택
6. Authorized redirect URIs에 아래 값 추가

```text
http://localhost:3000/api/auth/callback/google
https://YOUR_DOMAIN/api/auth/callback/google
```

7. 생성된 Client ID / Client Secret 복사
8. 환경변수에 입력

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 체크 포인트

- Consent Screen을 먼저 만들지 않으면 OAuth Client 생성이 막힐 수 있음
- 테스트 모드면 테스트 사용자 추가 필요
- 운영 공개 전 Publishing 상태 확인 필요
- 운영 도메인이 바뀌면 Redirect URI도 같이 수정해야 함

### Google에서 흔한 실수

- Redirect URI를 `localhost:3000`까지만 넣고 path를 안 넣음
- `google` callback path가 아니라 다른 path를 넣음
- 운영 도메인 등록 안 함
- 테스트 사용자 추가를 안 해서 로그인 차단됨

---

## 6. Naver 로그인 설정

### 공식 문서

- Auth.js Naver Provider: https://authjs.dev/getting-started/providers/naver
- 네이버 로그인 개발 가이드: https://developers.naver.com/docs/login/devguide/devguide.md
- 네이버 웹 애플리케이션 가이드: https://developers.naver.com/docs/login/web/web.md
- 네이버 로그인 API 문서: https://developers.naver.com/docs/login/api/api.md
- 네이버 Developers 앱 관리: https://developers.naver.com/apps
- Callback URL 안내: https://help.naver.com/service/23029/contents/17439?lang=ko&osType=COMMONOS

### 네가 해야 하는 일

1. 네이버 Developers 접속
2. 애플리케이션 생성
3. 사용 API에서 **네이버 로그인** 선택
4. 서비스 환경을 웹 기준으로 설정
5. Service URL 등록

```text
http://localhost:3000
https://YOUR_DOMAIN
```

6. Callback URL 등록

```text
http://localhost:3000/api/auth/callback/naver
https://YOUR_DOMAIN/api/auth/callback/naver
```

7. 필요한 동의항목 선택
   - 최소 추천: 이메일
8. Client ID / Client Secret 확인
9. 환경변수에 입력

```env
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

### 체크 포인트

- 네이버는 서비스 URL과 Callback URL이 등록값과 다르면 잘 막힘
- 운영 전 검수/제한 상태 확인 필요
- 테스트 계정만 허용되는 상태인지 확인 필요
- 프로필 항목 권한도 미리 확인해야 함

### 네이버에서 흔한 실수

- Service URL은 등록했는데 Callback URL을 잘못 넣음
- `http` / `https` 혼동
- 로컬 URL만 넣고 운영 URL 누락
- 검수/멤버관리 상태 확인 안 함

---

## 7. Kakao 로그인 설정

### 공식 문서

- Auth.js Kakao Provider: https://authjs.dev/getting-started/providers/kakao
- Kakao Login 메인: https://developers.kakao.com/product/kakaoLogin
- Kakao Login 공통 설정: https://developers.kakao.com/docs/latest/en/kakaologin/common
- Kakao Login 사전 준비: https://developers.kakao.com/docs/latest/en/kakaologin/prerequisite
- Kakao 보안 가이드: https://developers.kakao.com/docs/latest/en/getting-started/security-guideline
- Kakao Console: https://developers.kakao.com/console/app

### 네가 해야 하는 일

1. Kakao Developers에서 앱 생성
2. **Kakao Login 활성화**
3. Web 플랫폼 등록

```text
http://localhost:3000
https://YOUR_DOMAIN
```

4. Redirect URI 등록

```text
http://localhost:3000/api/auth/callback/kakao
https://YOUR_DOMAIN/api/auth/callback/kakao
```

5. 동의항목(Consent Items) 설정
   - 최소 추천: 이메일, 프로필
6. App Keys에서 REST API Key 확인
   - 이 값을 `KAKAO_CLIENT_ID`로 사용
7. 보안(Security)에서 Client Secret 활성화
   - 이 값을 `KAKAO_CLIENT_SECRET`로 사용
8. 환경변수에 입력

```env
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
```

### 체크 포인트

- Kakao Login을 켜지 않으면 에러 발생 가능
- Redirect URI를 등록하지 않으면 로그인 실패
- Web 플랫폼 등록 안 하면 브라우저 로그인에서 막힐 수 있음
- Client Secret은 사용 권장
- 이메일 동의항목은 앱 상태에 따라 추가 검토가 필요할 수 있음

### Kakao에서 흔한 실수

- REST API Key와 JavaScript Key를 혼동함
- Redirect URI 등록 없이 로그인부터 시도함
- Web 플랫폼 도메인 등록을 안 함
- Client Secret을 비활성 상태로 둠

---

## 8. `.env.local` 예시

아래 형태로 넣으면 된다.

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret

AUTH_SECRET=your_long_random_secret
```

운영 환경에도 같은 이름으로 등록해야 한다.

---

## 9. 배포 환경에서 추가로 확인할 것

### 꼭 확인

- `AUTH_SECRET` 등록됨
- 각 provider key 등록됨
- 운영 도메인 callback URL 등록됨
- 운영 환경에서 `https` 기준으로 등록됨

### 환경에 따라 고려

- reverse proxy / hosting 환경이면 `AUTH_TRUST_HOST=true` 필요 가능
- base path를 별도로 쓰면 `AUTH_URL` 확인 필요

공식 참고:
- https://authjs.dev/getting-started/deployment

---

## 10. 최종 체크리스트

### 공통

- [ ] `AUTH_SECRET` 생성 완료
- [ ] `.env.local`에 provider key 입력 완료
- [ ] 배포 환경 변수 입력 완료
- [ ] 로컬 callback URL 등록 완료
- [ ] 운영 callback URL 등록 완료

### Google

- [ ] Google Cloud 프로젝트 생성
- [ ] OAuth Consent Screen 설정
- [ ] Web application OAuth Client 생성
- [ ] redirect URI 등록 완료
- [ ] Client ID / Secret 확보

### Naver

- [ ] 네이버 앱 생성
- [ ] 네이버 로그인 API 선택
- [ ] Service URL 등록
- [ ] Callback URL 등록
- [ ] 동의항목 설정
- [ ] Client ID / Secret 확보
- [ ] 테스트계정/검수 상태 확인

### Kakao

- [ ] Kakao 앱 생성
- [ ] Kakao Login 활성화
- [ ] Web 플랫폼 등록
- [ ] Redirect URI 등록
- [ ] 동의항목 설정
- [ ] REST API Key 확인
- [ ] Client Secret 활성화 및 확보

---

## 11. 이 프로젝트 기준 최종 메모

- 로그인 UI는 별도 전용 페이지가 아니라 랜딩(`/`)의 로그인 모달 형태다.
- provider 설정은 이미 코드에 들어가 있으므로, **외부 설정만 맞으면 연결 자체는 바로 테스트 가능한 구조**다.
- 단, 이 문서는 어디까지나 **"네가 해야 하는 설정 작업"** 기준이다.
- 실제 로그인 테스트나 운영 검증은 이 설정이 끝난 뒤 진행해야 한다.

---

## 12. 빠른 결론

네가 지금 해야 하는 일은 딱 4가지다.

1. Google / Naver / Kakao 개발자 콘솔에서 앱 만들기
2. 각 provider에 callback URL 등록하기
3. Client ID / Secret 받아오기
4. `.env.local`과 배포 환경 변수에 넣기

이 4가지가 끝나면, 그 다음 단계로 실제 로그인 테스트를 진행하면 된다.
