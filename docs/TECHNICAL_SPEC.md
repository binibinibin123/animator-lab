# AutoVideo Technical Specification

> **AI 기반 자동 숏폼 영상 제작 플랫폼**
>
> Version: 1.0.0 | Last Updated: 2026-01-20

---

## 📋 Overview

AutoVideo는 텍스트 주제를 입력하면 AI가 자동으로 스크립트, 음성, 이미지, 영상을 생성하고 이를 합성하여 완성된 숏폼 영상을 출력하는 올인원 비디오 자동화 플랫폼입니다.

### Key Features

| Feature | Description | Technology |
|---------|-------------|------------|
| 🎬 **Script Generation** | AI 기반 자동 대본 생성 | Gemini 3 Flash |
| 🎙️ **Voice Synthesis** | 고품질 다국어 TTS | ElevenLabs |
| 🖼️ **Image Generation** | 캐릭터 일관성 유지 이미지 생성 | Gemini 2.5 Flash Image |
| 🎥 **Video Generation** | Image-to-Video 모션 생성 | ComfyUI (Local) |
| 🎞️ **Composition** | 전문 영상 편집 및 렌더링 | Remotion |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                      │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│ Homepage │  Create  │  Script  │  Voice   │  Image   │   Video   │
│          │          │  Page    │  Page    │  Page    │   Page    │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────┬─────┘
     │          │          │          │          │           │
     └──────────┴──────────┴──────────┴──────────┴───────────┘
                                │
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   Gemini     │     │  ElevenLabs  │     │   ComfyUI    │
    │  (Script/    │     │    (TTS)     │     │   (Video)    │
    │   Image)     │     │              │     │              │
    └──────────────┘     └──────────────┘     └──────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
             ┌──────────────┐        ┌──────────────┐
             │   Supabase   │        │   Remotion   │
             │  (Database/  │        │  (Rendering) │
             │   Storage)   │        │              │
             └──────────────┘        └──────────────┘
```

---

## 💾 Database Schema

### Projects Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key |
| `title` | TEXT | 프로젝트 제목 |
| `topic` | TEXT | 영상 주제/토픽 |
| `aspect_ratio` | TEXT | 화면 비율 (`16:9`, `9:16`, `1:1`) |
| `style` | TEXT | 비주얼 스타일 (e.g., `economy-1`, `anime`) |
| `status` | TEXT | 프로젝트 상태 |
| `duration` | INTEGER | 목표 영상 길이 (초) |
| `video_provider` | TEXT | 비디오 생성 제공자 (현재 `comfyui` 고정) |
| `video_url` | TEXT | 최종 렌더링된 영상 URL |
| `thumbnail_url` | TEXT | 썸네일 URL |
| `autopilot_status` | TEXT | 자동 생성 상태 |
| `autopilot_progress` | FLOAT | 자동 생성 진행률 (0.0-1.0) |
| `created_at` | TIMESTAMP | 생성 일시 |
| `updated_at` | TIMESTAMP | 수정 일시 |

### Segments Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key |
| `project_id` | UUID | Foreign Key → Projects |
| `order_index` | INTEGER | 세그먼트 순서 |
| `script_text` | TEXT | 대본 텍스트 |
| `audio_url` | TEXT | TTS 오디오 URL |
| `image_url` | TEXT | 생성된 이미지 URL |
| `video_url` | TEXT | 생성된 비디오 URL |
| `visual_description` | TEXT | 시각적 장면 설명 |
| `duration_ms` | INTEGER | 오디오 길이 (밀리초) |
| `video_provider_override` | TEXT | 세그먼트별 비디오 제공자 오버라이드 |
| `video_prompt` | TEXT | 비디오 모션 프롬프트 |
| `created_at` | TIMESTAMP | 생성 일시 |

---

## 🔌 API Endpoints

### Project Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/project` | 새 프로젝트 생성 |
| `GET` | `/api/project?id={id}` | 프로젝트 조회 |

### Script Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/script/generate` | AI 스크립트 생성 |

**Request Body:**
```json
{
  "topic": "오늘의 경제 뉴스",
  "duration": 60,
  "language": "ko",
  "persona": "finance"
}
```

### Voice/TTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/voices` | 사용 가능한 음성 목록 |
| `POST` | `/api/tts/generate` | TTS 생성 |
| `GET` | `/api/tts/generate?segmentId={id}` | TTS 상태 확인 |

### Image Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/image/generate` | 이미지 생성 |

**Request Body:**
```json
{
  "prompt": "A stickman character...",
  "style": "economy-1",
  "resolution": "2K",
  "segmentId": "uuid"
}
```

### Video Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/video/generate` | 비디오 생성 시작 |
| `GET` | `/api/video/generate?requestId={id}` | 비디오 생성 상태 폴링 |

**Request Body:**
```json
{
  "imageUrl": "https://...",
  "provider": "comfyui",
  "workflowId": "rapid-aio-mega-sage-2",
  "motion": "auto"
}
```

### Rendering

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/render` | 최종 영상 렌더링 |
| `GET` | `/api/render?projectId={id}` | 렌더링 상태 확인 |

---

## 🤖 AI Integrations

### 1. Gemini 3 Flash (Script Generation)

**Module:** `src/lib/ai/gemini.ts`

**Persona Presets:**
- `finance` - 경제/금융 전문 스크립트
- `storytelling` - 내러티브 중심 스토리텔링
- `entertainment` - 엔터테인먼트/유머

**Key Function:**
```typescript
generateScript(
  topic: string,
  durationSeconds: number,
  style: string,
  language: string,
  persona: string
): Promise<ScriptGenerationResult>
```

### 2. Gemini 2.5 Flash Image (Image Generation)

**Module:** `src/lib/ai/nanobanana.ts`

**Style Presets:**
| Style | Description |
|-------|-------------|
| `economy-1` | 심플 플랫 벡터 일러스트 |
| `anime` | 애니메이션 스타일 |
| `realistic` | 포토리얼리스틱 |
| `cinematic` | 시네마틱 영화 스타일 |
| `3d-render` | 3D 렌더링 |

**Character Consistency:**
- Reference image를 함께 전송하여 캐릭터 일관성 유지
- Style 프리셋으로 통일된 비주얼 적용

### 3. ElevenLabs (TTS)

**Module:** `src/lib/ai/elevenlabs.ts`

**Model:** `eleven_multilingual_v2`

**Features:**
- 23개 이상의 프리메이드 음성
- 한국어 포함 다국어 지원
- 정확한 MP3 duration 계산

---

## 🎬 ComfyUI Video Provider

**Module:** `src/lib/video/ComfyUIVideoProvider.ts`

### Workflow Configuration

| Workflow ID | Name | Description |
|-------------|------|-------------|
| `lf-i2v-v1.1` | LF i2v (Batch) v1.1 | Realism Optimized + Sage Attention |
| `rapid-aio-mega` | Rapid AIO Mega | WanVace To Video (High Quality) |
| `rapid-aio-mega-sage` | Rapid AIO Mega + Sage | WanVace + Sage Attention (Faster) |
| `rapid-aio-mega-sage-2` | Rapid AIO Mega + Sage v2 | Optimized CLIP Model |
| `ltx-video-default` | LTX Video (Fast) | Fast generation |

### Workflow Node Injection

각 워크플로우에 동적으로 주입되는 값:

| Node | Purpose | Value |
|------|---------|-------|
| `Node 16` | Input Image | 업로드된 이미지 파일명 |
| `Node 9` | Positive Prompt | 모션 프롬프트 |
| `Node 8` | Seed | 랜덤 시드 |
| `Node 39` | Output Prefix | 타임스탬프 기반 파일명 |

### Generation Flow

```
1. Upload source image to ComfyUI → /upload/image
2. Build workflow with injected parameters
3. Submit workflow → /prompt → returns prompt_id
4. Poll status → /history/{prompt_id}
5. Download output → /view?filename=...
6. Upload to Supabase Storage
```

---

## 🎞️ Remotion Video Composition

**Module:** `src/remotion/compositions/MainVideo.tsx`

### Composition Structure

```
MainVideo
├── Sequence (per segment)
│   └── SegmentContainer
│       ├── Video/Image (background)
│       ├── Audio (TTS)
│       └── Subtitle (overlay)
```

### Transition Effect

- **Type:** Slide In from Right
- **Duration:** 20 frames (0.67s @ 30fps)
- **Easing:** Bezier (0.25, 0.1, 0.25, 1)
- **Motion Blur:** Dynamic blur during transition

---

## 📱 Page Structure

### User Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Create  │ →  │ Script  │ →  │  Voice  │ →  │  Image  │ →  │  Video  │ →  │ Preview │
│  New    │    │  Edit   │    │  Select │    │ Generate│    │ Generate│    │ /Render │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Pages

| Route | Description |
|-------|-------------|
| `/` | 홈페이지 - 프로젝트 목록 |
| `/create/new` | 새 프로젝트 생성 |
| `/project/[id]/script` | 스크립트 생성/편집 |
| `/project/[id]/voice` | 음성 선택 및 TTS 생성 |
| `/project/[id]/image` | 이미지 생성 |
| `/project/[id]/video` | 비디오 클립 생성 |
| `/project/[id]/preview` | 미리보기 및 렌더링 |
| `/settings` | 앱 설정 |

---

## ⚙️ Environment Variables

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# AI Services
GOOGLE_AI_API_KEY=xxx          # Gemini 3 Flash & 2.5 Flash Image
ELEVENLABS_API_KEY=xxx         # ElevenLabs TTS

# Video Generation
COMFYUI_BASE_URL=http://127.0.0.1:8188
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.1.3 |
| **Language** | TypeScript 5.x |
| **React** | React 19.2.3 |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **Styling** | TailwindCSS 4.x |
| **Video Composition** | Remotion 4.0.407 |
| **Schema Validation** | Zod 3.22.3 |

---

## 📊 Production Requirements

### ComfyUI Setup

필수 모델 및 확장:
- **UNET:** `wan2.2-rapid-mega-aio-nsfw-v12.1-Q3_K.gguf`
- **CLIP:** `t5xxl_um_fp8_e4m3fn_scaled.safetensors`
- **VAE:** `wan_2.1_vae.safetensors`
- **Extension:** Sage Attention (sageattn_qk_int8_pv_fp16_triton)

### Rendering Requirements

- **Resolution:** 1920x1080 (Full HD)
- **FPS:** 30
- **Format:** MP4 (H.264)
- **Audio:** AAC 128kbps

---

## 📝 Notes

- Video Provider는 현재 **ComfyUI 전용**으로 고정됨
- fal.ai 클라우드 옵션은 비용 문제로 비활성화
- 캐릭터 일관성은 Reference Image 방식으로 구현
- 모든 미디어는 Supabase Storage에 저장됨
