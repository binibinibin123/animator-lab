# AutoVideo 기능 명세서

> **AI 기반 자동 숏폼 영상 제작 솔루션**  
> 버전: 1.0 | 최종 업데이트: 2026-01-19

---

## 📋 개요

AutoVideo는 주제 입력만으로 스크립트, 음성, 이미지, 영상을 자동 생성하여 완성된 숏폼 비디오를 제작하는 AI 기반 솔루션입니다.

---

## 🏗️ 시스템 아키텍처

| 레이어 | 기술 스택 |
|--------|----------|
| **Frontend** | Next.js 14, React, TailwindCSS |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **AI APIs** | Google Gemini, ElevenLabs, fal.ai |
| **Rendering** | Remotion (서버 사이드 렌더링) |

---

## ✨ 핵심 기능

### 1. 프로젝트 관리

| 기능 | 설명 |
|------|------|
| 대시보드 | 전체 프로젝트 목록 조회, 생성, 삭제 |
| 프로젝트 생성 | 화면 비율(16:9, 9:16, 1:1) 및 아트 스타일 선택 |
| 진행 상태 추적 | 단계별 진행 UI (스크립트 → 음성 → 이미지 → 비디오 → 프리뷰) |

### 2. 스크립트 생성 (AI)

| 항목 | 내용 |
|------|------|
| **AI 모델** | Google Gemini 3 Flash |
| **입력** | 주제/프롬프트, 영상 길이, 언어(한/영), 페르소나 |
| **출력** | 세그먼트별 대본 + 시각적 설명 (visual_description) |
| **페르소나** | 경제 유튜버, 교육자, 스토리텔러, 뉴스 앵커, 엔터테이너 |

### 3. TTS 음성 생성

| 항목 | 내용 |
|------|------|
| **API** | ElevenLabs |
| **기능** | 다국어 TTS, 음성 미리듣기, 세그먼트별 생성 |
| **출력** | MP3 오디오 URL + duration_ms |

### 4. 이미지 생성 (AI)

| 항목 | 내용 |
|------|------|
| **AI 모델** | Google Gemini 2.5 Flash (Imagen) |
| **스타일 프리셋** | 애니메이션, 실사, 3D, 수채화, 경제유튜브1 등 |
| **레퍼런스 이미지** | 스타일별 레퍼런스 파일로 캐릭터 일관성 유지 |
| **Negative Prompt** | 텍스트, 워터마크, 복잡한 배경 제거 |

### 5. 비디오 생성 (AI)

| 항목 | 내용 |
|------|------|
| **API** | fal.ai (Hailuo Minimax) |
| **입력** | 이미지 URL + 모션 프롬프트 |
| **모션 분석** | Gemini Vision으로 이미지 분석 후 최적 모션 생성 |
| **스타일 최적화** | 카툰 스타일: 최소 움직임으로 변형 방지 |

### 6. Remotion 렌더링

| 항목 | 내용 |
|------|------|
| **합성 방식** | 비디오/이미지 + TTS 오디오 + 자막 오버레이 |
| **자막 스타일** | 기본, 모던, 넷플릭스, 유튜브 쇼츠 등 |
| **타이밍 기준** | TTS 오디오 길이 기준 (비디오 루프 지원) |
| **출력** | MP4 (1080p/4K), 실시간 진행률 스트리밍 |

---

## 🔌 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/project` | POST | 새 프로젝트 생성 |
| `/api/script/generate` | POST | AI 스크립트 생성 |
| `/api/tts/generate` | POST | TTS 음성 생성 |
| `/api/voices` | GET | 사용 가능한 음성 목록 |
| `/api/image/generate` | POST | AI 이미지 생성 |
| `/api/video/generate` | POST/GET | 비디오 생성 및 상태 확인 |
| `/api/render` | POST | Remotion 서버 렌더링 (SSE) |
| `/api/download` | GET | 렌더링된 파일 다운로드 |
| `/api/segment` | POST/PATCH | 세그먼트 CRUD |

---

## 📱 화면 구성

| 경로 | 화면 | 기능 |
|------|------|------|
| `/` | 대시보드 | 프로젝트 목록, 생성, 삭제 |
| `/create/new` | 프로젝트 생성 | 비율/스타일 선택 |
| `/project/[id]/script` | 스크립트 | 주제 입력, AI 생성, 편집 |
| `/project/[id]/voice` | 음성 | TTS 생성, 미리듣기 |
| `/project/[id]/image` | 이미지 | AI 이미지 생성, 프롬프트 편집 |
| `/project/[id]/video` | 비디오 | AI 비디오 생성, 상태 모니터링 |
| `/project/[id]/preview` | 프리뷰 | Remotion 플레이어, MP4 다운로드 |

---

## 🎨 지원 아트 스타일

| ID | 이름 | 설명 |
|----|------|------|
| `economy-1` | 경제유튜브 1 | 노란 박스 모자 스틱맨 캐릭터 |
| `anime` | 애니메이션 | 일본 애니메이션 스타일 |
| `realistic` | 실사 | 포토리얼리스틱 |
| `3d-render` | 3D 렌더 | 3D 그래픽 스타일 |
| `watercolor` | 수채화 | 수채화 일러스트 |
| `custom` | 커스텀 | 사용자 정의 프롬프트 |

---

## 💾 데이터 모델 (Supabase)

### Projects 테이블
```
id, title, topic, aspect_ratio, style, status, duration, created_at
```

### Segments 테이블
```
id, project_id, order_index, script_text, visual_description,
audio_url, image_url, video_url, duration_ms
```

---

## 📊 비용 (1분 영상 기준)

| 항목 | 비용 |
|------|------|
| 스크립트 | ~$0.001 |
| 이미지 (10장) | ~$0.10 |
| TTS | ~$0.07 |
| 비디오 (10개) | ~$1.90 |
| **합계** | **~$2.07** |
