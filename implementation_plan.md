# Implementation Plan - Channel Automation & One-Shot Test

이 계획은 "채널 기반 완전 자동화"와 "테스트 모드"를 구현하기 위한 단계별 로드맵입니다.
Archie와 Hackie의 토론을 통해 **"채널 = 프로젝트 팩토리(Channel as Project Factory)"** 패턴으로 설계를 확정했습니다.

## User Review Required

> [!IMPORTANT]
> **DB Schema Update**: `channels` 테이블이 새로 생성되고, `projects` 테이블에 `channel_id` FK가 추가됩니다.
> **Vercel 호환성**: RSS 파싱을 위한 API Route가 추가되지만, 파일시스템을 쓰지 않으므로 이는 Vercel 호환됩니다. (기존 렌더링/다운로드 제약은 여전함)

## Proposed Changes

### Phase 1: Database Schema & Basic UI
#### [NEW] `supabase/migrations/xxxx_add_channels.sql` (Conceptual)
*   **`channels` Table**:
    *   `id`: UUID (PK)
    *   `name`: Text (채널명)
    *   `description`: Text (채널 설명, 랜덤 주제 생성 시 Context로 사용)
    *   `type`: Enum ('youtube', 'shorts', etc - future use)
    *   `visual_persona_url`: Text (레퍼런스 이미지 URL)
    *   `style_preset`: Text (economy-1, senior-1 등)
    *   `voice_id`: Text (ElevenLabs ID)
    *   `topic_source`: Text ('manual', 'rss', 'random')
    *   `rss_url`: Text (Nullable)
    *   `created_at`: Date
*   **`projects` Table Update**:
    *   `channel_id`: UUID (FK to channels.id, Nullable)
    *   `is_test_run`: Boolean (Default false)

### Phase 2: Frontend Components (Channel Dashboard)
#### [NEW] `src/app/channels/page.tsx`
*   채널 목록 표시
*   각 채널 카드에 [자동 생성], [테스트 실행], [설정] 버튼 배치

#### [NEW] `src/app/channels/new/page.tsx`
*   채널 생성 폼
*   **Visual Persona**: 이미지 업로드 + 스타일 프리셋 선택
*   **Voice**: 기존 Voice Selector 재사용
*   **Topic Config**: RSS URL 입력 or 랜덤 주제 성향 설정

### Phase 3: Core Logic & Topic Sources
#### [MODIFY] `src/app/api/project/create/route.ts`
*   기존 수동 생성 로직을 유지하되, `channel_id` 파라미터를 처리하는 분기 추가.
*   **Tone Cloning Logic**:
    *   만약 `channel_id`가 있으면, 해당 채널의 **가장 오래된(첫 번째) 프로젝트**를 DB에서 조회.
    *   그 프로젝트의 `script_text`를 가져와 `generateScript`에 `referenceSample`로 전달.
*   **Topic Source Handling**:
    *   `manual`: 사용자 입력 주제 사용.
    *   `random`: 채널 `description`을 기반으로 Gemini에게 주제 생성 요청

#### [MODIFY] `src/lib/ai/gemini.ts`
*   `generateScript` 함수 확장:
    *   `referenceSample`: string (Tone Cloning용 문체 예시)
    *   `isTestRun`: boolean (true면 `durationSeconds`를 강제로 6초로 설정)

### Phase 4: Test Mode (One-Shot)
*   **Flow**:
    1.  사용자가 [테스트 실행] 클릭
    2.  `createProject` API 호출 시 `isTestRun: true` 전달
    3.  **Script Gen**: 6초 분량(약 1~2문장) 대본 생성 -> 자동으로 1개 세그먼트만 생성됨.
    4.  **Auto Advance**: 기존 오토파일럿 로직이 "세그먼트가 1개뿐인 프로젝트"를 감지하고 순식간에 처리.

## Phase 2.5: YouTube Channel Cloning (Completed)
#### [NEW] [src/app/api/analyze-youtube/route.ts](file:///e:/coding/0118/autovideo/src/app/api/analyze-youtube/route.ts)
*   **Input**: YouTube URL.
*   **Logic**: Scrape -> Gemini Analyze -> JSON return.

#### [MODIFY] [src/app/channels/new/page.tsx](file:///e:/coding/0118/autovideo/src/app/channels/new/page.tsx)
*   Top section for URL input.
*   Auto-populate form fields.

## Phase 3: Core Logic & Topic Sources

### Channel UX Improvements
#### [NEW] [src/components/voice/VoiceSelector.tsx](file:///e:/coding/0118/autovideo/src/components/voice/VoiceSelector.tsx)
- Extract voice selection grid from `VoicePage`.
- Use in `NewChannelPage` and `EditChannelPage`.

#### [NEW] [src/components/channel/ChannelForm.tsx](file:///e:/coding/0118/autovideo/src/components/channel/ChannelForm.tsx)
- Reusable form for Create/Edit.

#### [NEW] [src/app/channels/[id]/edit/page.tsx](file:///e:/coding/0118/autovideo/src/app/channels/%5Bid%5D/edit/page.tsx)
- Page to load existing channel and render `ChannelForm`.

#### [NEW] [src/components/dashboard/CreateProjectModal.tsx](file:///e:/coding/0118/autovideo/src/components/dashboard/CreateProjectModal.tsx)
- Modal appearing when clicking "Auto Generate".
- Inputs: Topic (override), Duration (slider/input).

#### [MODIFY] [src/app/channels/page.tsx](file:///e:/coding/0118/autovideo/src/app/channels/page.tsx)
- Add "Edit" button to Channel cards.
- Connect "Auto Generate" button to `CreateProjectModal`.

## Verification Plan

### Automated Tests
*   **RSS Parser Test**: `src/scripts/test-rss.ts` 생성하여 RSS 파싱 로직 검증.
*   **Tone Cloning Query**: DB 쿼리(첫 번째 프로젝트 가져오기)가 올바른지 `debug-db` 페이지에서 검증.

### Manual Verification
1.  **채널 생성**: 새 채널 생성, 이미지 업로드, RSS URL 등록.
2.  **원샷 테스트**: [테스트 실행] 버튼 클릭 -> 1분 내에 1컷짜리 영상 완성되는지 확인.
3.  **톤 일관성**: 첫 번째 프로젝트(수동 생성)와 두 번째 프로젝트(자동 생성)의 대본 어투 비교.
4.  **RSS 연동**: RSS 업데이트 후 [자동 생성] 클릭 시 해당 뉴스 내용으로 대본 나오는지 확인.
### Manual Verification
1. **Voice Preview**: Go to `/channels/new`, verify voice list loads and plays audio.
2. **Edit Channel**: Create a channel, click Edit, change name/voice, save. Verify updates.
3. **Auto Generate**: Click ⚡, set duration to 30s. Verify generated project has 30s duration.
