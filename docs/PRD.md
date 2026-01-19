아래는 답변을 반영해 **즉시 구현 가능한 최종 PRD**입니다.
(추가 질문 없음 · 가정은 명시적으로 표기)

---

# 📄 Product Requirements Document (PRD)

## AI 영상 자동화 에이전트 (가칭)

---

## 0) Summary

### One-Sentence Definition

**주제 한 줄 입력만으로 유튜브 수익화 가능한 롱폼 영상을 자동 생성하는 한국어 전용 AI 영상 자동화 에이전트**

### Core Value

* 대본 → 음성 → 컷 → 이미지 → 영상 → 썸네일 **완전 자동화**
* **유튜브 수익화 통과 수준**을 목표로 한 결과물 품질
* 오토파일럿 + 승인/수정 가능한 **세미 자동 워크플로우**
* 비개발자 기준 **원클릭 사용성**
* 가성비 중심 **외부 API 기반 AI 파이프라인**

### Assumptions

* 대상 언어: **한국어 단일**
* 플랫폼: **Web SaaS**
* 대상 사용자: **개인 크리에이터**
* 인증: Clerk (이메일/소셜)
* 과금: 크레딧 충전형 (개인 사용)
* 초기 업로드: 수동 다운로드 (YouTube 자동 업로드 제외)
* 저작권: 사용자 책임 고지 + AI 생성물 면책 고지

---

## 1) Goals & Success Metrics

### Primary Goals

* 1회 입력으로 **10분 이내 롱폼 영상 생성**
* 유튜브 **수익화 심사 통과 가능성 극대화**
* 영상 제작 진입 장벽 제거

### Non-Goals

* 유튜브 채널 관리/업로드 자동화
* 팀 협업/권한 관리
* 쇼츠 전용 최적화 (Post-MVP)

### KPIs

| Metric              | Target |
| ------------------- | ------ |
| 자동 생성 성공률           | ≥ 90%  |
| 평균 생성 시간 (5~10분 영상) | ≤ 15분  |
| 생성 후 수정 없이 다운로드 비율  | ≥ 60%  |
| 재사용률 (DAU/MAU)      | ≥ 35%  |

---

## 2) Users & Use Cases

### Target Users

* 얼굴 노출 없는 유튜브 롱폼 운영자
* 정보/교양/AI/경제 채널 개인 크리에이터

### Jobs-to-Be-Done

* “주제만 정하면 **사람이 만든 것처럼 보이는 영상**을 얻고 싶다”
* “편집/툴 학습 없이 **수익화 가능한 영상**을 만들고 싶다”

### Ranked Use Cases

1. 주제 입력 → 자동 생성 → 바로 업로드
2. 자동 생성 후 컷/이미지 일부 수정
3. 동일 포맷으로 주제만 바꿔 반복 생성

---

## 3) Scope Definition

### MVP Scope

* 16:9 롱폼 영상
* 오토파일럿 모드
* 승인/수정 단계
* 기본 스타일 3종
* 한국어 TTS
* MP4 + SRT 출력

### Post-MVP

* 쇼츠 자동 분할
* 다국어
* 채널별 프리셋
* BGM 자동 믹싱

### Out of Scope

* 자동 업로드
* 협업
* 라이브 스트리밍

---

## 4) Functional Requirements

### FR-1 프로젝트 관리 (P0)

* 프로젝트 생성/조회/삭제
* 단계별 상태 저장
  **AC:** 새로고침 후에도 진행 단계 유지

### FR-2 오토파일럿 실행 (P0)

* 주제 입력 → 전체 파이프라인 실행
  **AC:** 사용자 개입 없이 영상 생성 완료

### FR-3 승인/수정 단계 (P0)

* 컷 단위 이미지 재생성
* 컷 병합/분할
  **AC:** 수정 후 재렌더 가능

### FR-4 대본 생성 (P0)

* 주제 기반 LLM 생성
* 길이 옵션 (3/5/8/10분)
  **AC:** TTS와 싱크 가능한 문장 구조

### FR-5 음성 생성 (P0)

* 한국어 TTS 다중 보이스
  **AC:** 문장 단위 타임스탬프 제공

### FR-6 이미지 생성 (P0)

* 컷별 프롬프트 자동 생성
  **AC:** 동일 캐릭터/화풍 유지

### FR-7 영상 생성 (P0)

* 컷별 영상 생성 후 합성
  **AC:** 오디오 싱크 ±0.2초 이내

### FR-8 썸네일 생성 (P1)

* 제목 자동 삽입
  **AC:** 한글 텍스트 깨짐 없음

---

## 5) User Stories

**US-1**

* Given 주제를 입력했을 때
* When 오토파일럿을 실행하면
* Then 전체 영상이 자동 생성된다

**US-2**

* Given 자동 생성된 컷이 있을 때
* When 특정 컷을 수정하면
* Then 해당 컷만 재생성된다

---

## 6) User Flows

### 오토파일럿

1. 로그인
2. 주제 입력
3. 생성 시작
4. 미리보기
5. (선택) 수정
6. 다운로드

### Error States

* API 실패 → 단계별 재시도
* 크레딧 부족 → 결제 유도

---

## 7) Data & Architecture

### 7.1 Data Model (Supabase)

**Project**

* id
* user_id
* title
* status
* duration
* created_at

**Segment**

* id
* project_id
* script_text
* audio_url
* image_url
* video_url
* order

**CreditLedger**

* user_id
* delta
* reason
* created_at

---

### 7.2 System Architecture

**Frontend**

* Next.js App Router
* Server Actions 트리거

**Backend**

* API Routes (or Edge)
* BullMQ Queue

**AI Pipeline (외부 API, 가성비 우선)**

| 단계        | API 전략                              |
| --------- | ----------------------------------- |
| Script    | Gemini 3 Pro                        |
| TTS       | ElevenLabs / Naver CLOVA            |
| Image     | Nano Banana                         |
| Video     | fal.ai (Hailuo 2.3 Fast / Kling 2.6) |
| Thumbnail | Nano Banana Pro                     |

> 비용 최소화: 실패율 낮은 모델 우선 → 고가 모델은 fallback

---

### 7.3 APIs / Interfaces (예시)

**POST /api/project**

```json
{ "topic": "AI가 바꾸는 미래 직업" }
```

**POST /api/render**

```json
{ "projectId": "uuid", "mode": "autopilot" }
```

---

## 8) Non-Functional Requirements

* **Security:** Clerk 인증 + RLS
* **Privacy:** 사용자 데이터 비공개
* **Performance:** 평균 생성 ≤ 15분
* **Reliability:** 단계별 재시도
* **Accessibility:** 키보드 네비게이션
* **Compliance:** AI 생성물 고지

---

## 9) Analytics & Observability

### Events

* project_created
* render_started
* render_completed
* render_failed
* credit_spent

### Metrics

* 성공률
* 평균 생성 시간
* 컷 수정 비율

---

## 10) Risks & Tradeoffs

| Risk       | Impact | Mitigation |
| ---------- | ------ | ---------- |
| 영상 API 불안정 | 높음     | 멀티 벤더      |
| 비용 폭증      | 높음     | 크레딧 제한     |
| AI 티       | 중간     | 스타일 고정     |

---

## 11) Milestones & Delivery Plan

| Phase         | Duration |
| ------------- | -------- |
| Core Pipeline | 2주       |
| 오토파일럿         | 1주       |
| 수정 UI         | 1주       |
| 안정화           | 1주       |

---

## 12) Test Plan & Launch Checklist

### E2E

* 주제 입력 → 다운로드
* 수정 후 재렌더

### Launch Checklist

* 크레딧 차감 검증
* API 실패 처리
* 대기열 모니터링

### Rollback

* 이전 안정 버전 스위치

---

## 13) Open Questions (Non-Blocking)

* 영상 스타일 추가 우선순위
* BGM 자동 삽입 시점

---

## 14) Next Steps

1. API 벤더 PoC
2. UI 와이어프레임
3. 크레딧 단가 산정
4. MVP 개발 착수

