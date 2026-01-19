# AutoVideo 작업 내역 - 2026-01-19

## 세션 요약

이 세션에서는 AutoVideo 앱의 대본 생성 기능 개선과 영상 생성 파이프라인 구현을 진행했습니다.

---

## 완료된 작업

### 1. 대본 생성 기능 개선

#### 1.1 언어 선택 기능 추가
- **파일**: `src/app/project/[id]/script/page.tsx`
- 한국어(🇰🇷) / English(🇺🇸) 선택 UI 추가
- 선택된 언어에 따라 placeholder 텍스트 변경

#### 1.2 페르소나(스타일) 선택 기능 추가
- **파일**: `src/app/project/[id]/script/page.tsx`, `src/lib/ai/gemini.ts`
- 5가지 대본 스타일 추가:
  - 📊 **경제 유튜버** - Bob Invests 스타일, 차분하고 이성적인 데이터 기반 분석
  - 📚 **교육자** - 친절한 강의형 설명
  - 🎭 **스토리텔러** - 다큐멘터리 스타일 내러티브
  - 📺 **뉴스 앵커** - 객관적 정보 전달
  - 🎉 **엔터테이너** - 유머러스하고 가벼운 톤

#### 1.3 API 업데이트
- **파일**: `src/app/api/script/generate/route.ts`
- `language`, `persona` 파라미터 추가
- Gemini API에 전달하여 선택된 스타일로 대본 생성

---

### 2. 영상 생성 파이프라인 구현

#### 2.1 이미지 분석 기반 프롬프트 자동 생성
- **새 파일**: `src/lib/ai/videoPrompt.ts`
- Gemini Vision API를 사용하여 이미지 분석
- 대본(scriptText)과 시각적 설명(visualDescription)을 참고하여 프롬프트 생성
- **고정 카메라 + 정적 모션** 규칙 적용 (AI 영상 아티팩트 방지)

#### 2.2 Hailuo 2.3 Fast API 연동
- **파일**: `src/lib/ai/fal.ts`
- 올바른 모델 엔드포인트 설정: `fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video`
- 환경변수 `FAL_KEY` 사용
- Duration: 6초 또는 10초 지원
- 비동기 작업 처리 (request_id 기반 폴링)

#### 2.3 영상 생성 API 업데이트
- **파일**: `src/app/api/video/generate/route.ts`
- POST: 이미지 분석 → 프롬프트 생성 → Hailuo API 호출
- GET: 폴링으로 생성 상태 확인 및 완료 시 DB 업데이트

---

### 3. 실시간 로그 패널 추가

#### 3.1 영상 생성 페이지 UI 개선
- **파일**: `src/app/project/[id]/video/page.tsx`
- 우측 상단에 고정된 디버그 로그 패널 추가
- 로그 유형별 색상 구분:
  - 흰색: 일반 정보
  - 노란색: 경고/대기 중
  - 녹색: 성공
  - 빨간색: 에러
- 타임스탬프, 자동 스크롤, 지우기/닫기 기능

#### 3.2 폴링 로직 개선
- 첫 폴링 전 10초 대기
- 10초 간격 폴링
- 최대 30회 재시도 (최대 5분 대기)
- 에러 시 재시도 로직

---

## 미해결 이슈

### fal.ai 영상 생성 결과 수신 문제

**현상**: fal.ai 대시보드에서는 영상 생성 완료가 확인되지만, 앱의 폴링에서는 계속 `in_progress` 상태로 표시됨

**시도한 해결 방법**:
1. Status 엔드포인트 (`/requests/{requestId}/status`) 사용 → 상태값 매핑 시도
2. Result 엔드포인트 (`/requests/{requestId}`) 직접 호출 → 202 vs 200 응답 확인
3. 다양한 상태값 매핑 (COMPLETED, OK, IN_QUEUE, IN_PROGRESS 등)
4. response_url 필드 확인

**가능한 원인**:
- fal.ai REST API의 응답 형식이 문서와 다를 수 있음
- 공식 `@fal-ai/client` 라이브러리 사용이 더 안정적일 수 있음
- 엔드포인트 경로나 인증 방식의 차이

**추천 다음 단계**:
1. 터미널에서 서버 로그 확인 (`[fal.ai]` 로그)
2. 실제 fal.ai API 응답 형식 확인
3. 필요시 `@fal-ai/client` 공식 라이브러리로 전환 고려

---

## 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/app/project/[id]/script/page.tsx` | 언어/페르소나 선택 UI 추가 |
| `src/app/api/script/generate/route.ts` | language, persona 파라미터 처리 |
| `src/lib/ai/gemini.ts` | 페르소나별 시스템 프롬프트 구현 |
| `src/lib/ai/videoPrompt.ts` | **신규** - 이미지 분석 기반 프롬프트 생성 |
| `src/lib/ai/fal.ts` | Hailuo 2.3 Fast API 연동 |
| `src/app/api/video/generate/route.ts` | 자동 프롬프트 생성 및 폴링 로직 |
| `src/app/project/[id]/video/page.tsx` | 실시간 로그 패널, 폴링 개선 |

---

## 환경 변수

```env
GOOGLE_AI_API_KEY=   # Gemini API 키
FAL_KEY=             # fal.ai API 키
```

---

## 다음 세션 TODO

- [ ] fal.ai 영상 생성 결과 수신 문제 해결
- [ ] `@fal-ai/client` 라이브러리 도입 검토
- [ ] 영상 생성 완료 후 DB 업데이트 확인
- [ ] 전체 영상 생성 → 미리보기 플로우 테스트
