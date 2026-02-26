# AutoVideo 기능 명세서

> AI 기반 숏폼 영상 제작/자동화 시스템  
> 버전: 1.1 | 최종 업데이트: 2026-02-23

---

## 1. 제품 개요

AutoVideo는 주제(Topic) 입력을 시작점으로 대본 생성, TTS, 이미지 생성, 비디오 생성, 최종 렌더링까지 수행해 완성 영상을 만드는 워크플로우형 웹 앱이다.

핵심은 다음 두 가지 모드다.

1. 수동 단계 진행 모드: 사용자가 단계별로 결과를 확인/수정하며 제작
2. 오토파일럿 모드: SSE 기반 스트림으로 생성 상태를 실시간 확인하며 자동 제작

---

## 2. 사용자 및 사용 시나리오

### 2.1 주요 사용자

- 숏폼 콘텐츠 제작자 (빠른 반복 제작)
- 채널 운영자 (주제/스타일 템플릿 기반 대량 생산)
- 운영자/개발자 (AI 파이프라인 점검, 디버그)

### 2.2 대표 시나리오

1. 대시보드에서 프로젝트 생성
2. Script -> Voice -> Image -> Video -> Thumbnail -> Preview 단계 진행
3. Render 완료 후 파일 다운로드

또는

1. 오토파일럿 페이지에서 주제만 입력
2. 자동 생성 진행률/로그 확인
3. 생성 완료 프로젝트로 이동 후 후편집 및 렌더링

---

## 3. 기능 범위

### 3.1 프로젝트/세그먼트 관리

- 프로젝트 생성/조회/수정/삭제
- 프로젝트 복제, 테스트 런, 채널 자동화 생성 지원
- 세그먼트 분할/병합/업데이트
- 프로젝트 상태(`status`)와 오토파일럿 상태(`autopilot_status`, `autopilot_progress`) 관리

### 3.2 AI 대본 생성

- 주제, 길이, 스타일/페르소나 기반 대본 생성
- 세그먼트 단위 대본 + 시각 설명(`visual_description`) 생성
- 한국어/영어 혼합 환경 대응

### 3.3 음성(TTS) 생성

- ElevenLabs 기반 세그먼트별 음성 생성
- 오디오 URL 저장 및 길이(`duration_ms`) 동기화
- 음성 목록 조회 API 제공

### 3.4 이미지 생성

- 프롬프트 또는 대본 기반 이미지 생성
- 스타일 프리셋 + `public/styles/*` 레퍼런스 이미지 적용
- 생성 이미지 URL을 세그먼트/프로젝트 썸네일과 연동

### 3.5 비디오 생성

- 이미지 + 모션 프롬프트 기반 클립 생성
- Fal 기반 비디오 생성 파이프라인
- 비동기 잡 상태 조회(queued/running/succeeded/failed)
- 성공 시 세그먼트 `video_url` self-healing 동기화

### 3.6 썸네일 생성

- 스크립트 분석 후 CTR 중심 텍스트/비주얼 기획
- 기획 결과를 기반으로 썸네일 이미지 생성 및 프로젝트 반영

### 3.7 렌더링/다운로드

- Remotion 기반 최종 합성 렌더링
- SSE로 진행률/로그/result 이벤트 스트리밍
- 결과 파일을 임시 저장소에 생성 후 다운로드 API로 전달

### 3.8 자동화/운영 기능

- 오토파일럿 생성 스트림(`/api/autopilot/create`)
- RSS/유튜브 분석 유틸 API
- 텔레그램 봇 기반 완료 알림 및 상태 조회(`npm run bot`)

---

## 4. 화면(UX) 명세

| 경로 | 화면 목적 | 핵심 동작 |
|---|---|---|
| `/` | 대시보드 | 프로젝트 목록, 정렬/검색, 생성/삭제/복제 |
| `/create` | 제작 시작 허브 | 수동 생성/오토파일럿 진입 |
| `/create/autopilot` | 오토파일럿 실행 | 주제 입력, 로그/진행률 스트림 수신 |
| `/project/[id]/script` | 대본 단계 | 생성/편집/저장 |
| `/project/[id]/voice` | 음성 단계 | TTS 생성/재생/저장 |
| `/project/[id]/image` | 이미지 단계 | 이미지 생성/재생성/저장 |
| `/project/[id]/video` | 비디오 단계 | 생성 요청/상태 폴링 |
| `/project/[id]/thumbnail` | 썸네일 단계 | 썸네일 생성/적용 |
| `/project/[id]/preview` | 프리뷰 단계 | 플레이/렌더/다운로드 |

---

## 5. API 명세 (기능 관점)

### 5.1 프로젝트/세그먼트

- `/api/project` (GET/POST/PATCH/DELETE)
- `/api/project/reset-media`, `/api/project/sync-thumbnails`
- `/api/segment`, `/api/segment/update`
- `/api/settings`

### 5.2 생성 파이프라인

- `/api/script/generate`
- `/api/tts/generate`, `/api/voices`
- `/api/image/generate`
- `/api/video/generate` (POST 생성 + GET 상태조회)
- `/api/thumbnail/generate`

### 5.3 스트리밍/출력

- `/api/autopilot/create` (SSE)
- `/api/render` (SSE)
- `/api/download`

### 5.4 운영/유틸

- `/api/analyze-youtube`
- `/api/utils/rss`
- `/api/debug/cleanup-base64`

---

## 6. 상태 전이 명세

### 6.1 프로젝트 단계 상태

대표 상태 흐름:

`draft/settings -> script -> voice -> image -> video -> thumbnail -> preview/completed`

특성:

- 단계 페이지는 순차 제작을 돕지만, 사용자가 이전 단계 재작업 가능
- 오토파일럿은 내부적으로 단계 상태를 자동 전이

### 6.2 비디오 잡 상태

`queued -> running -> succeeded | failed`

특성:

- `video_jobs` 기준 상태 조회
- 최종 성공 시 세그먼트 URL 동기화 보장 로직 포함

---

## 7. 데이터 명세 (요약)

### 7.1 projects

- 식별/메타: `id`, `title`, `topic`, `created_at`, `updated_at`
- 제작 설정: `style`, `aspect_ratio`, `duration`, `video_provider`
- 상태: `status`, `autopilot_status`, `autopilot_progress`
- 결과물: `thumbnail_url`, `video_url`

### 7.2 segments

- 기본: `id`, `project_id`, `order_index`, `script_text`, `visual_description`
- 미디어: `audio_url`, `image_url`, `video_url`
- 제어: `duration_ms`, `video_prompt`

### 7.3 video_jobs

- `id`, `segment_id`, `provider`, `external_job_id`
- `status`, `progress`, `output_url`, `error`
- `started_at`, `finished_at`

---

## 8. 비기능 요구사항

### 8.1 성능/응답

- 장시간 작업은 동기 응답 대신 SSE 스트리밍 제공
- 상태 폴링 및 진행률 업데이트는 사용자에게 지속 피드백 제공

### 8.2 안정성

- 외부 Provider 실패 시 오류 로그 및 상태 반영
- 일부 단계는 실패 허용/재시도 가능한 구조
- 렌더/다운로드는 임시 파일 경로 검증 포함

### 8.3 보안

- 서버 쓰기 작업은 service-role 서버 클라이언트 사용
- 다운로드 API는 파일명 경로 탐색 방지 검사 수행
- 비밀키는 `.env.local` 기반 서버 환경변수로 관리

### 8.4 운영성

- 봇/스크립트로 운영 점검 가능
- 마이그레이션은 SQL 파일 기반으로 관리(자동 러너 없음)

---

## 9. 제약 및 제외 범위

### 9.1 제약

- 렌더/다운로드 경로는 로컬 파일시스템 의존성이 있음
- 외부 AI API 쿼터/요금/지연에 직접 영향 받음
- 테스트 프레임워크가 기본 구성되어 있지 않음

### 9.2 제외 범위(현재 버전)

- 완전한 CI 기반 마이그레이션 자동 적용
- 서버리스 무상태 환경만을 전제한 렌더 구조
- 전면적인 다중 테넌트 권한 체계

---

## 10. 운영 커맨드

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run bot
```
