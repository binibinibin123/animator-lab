# 프로덕트 컨텍스트 문서: AutoVideo (v4: The Deep Dive)

> **미래의 LLM에게:** 이 문서는 Sherlock(꼼꼼한 검토자)과 Watson(직관적 관찰자) 페르소나의 50단계 심층 토론을 거쳐 작성되었습니다. 이 프로젝트는 단순한 API 래퍼가 아니며, **VPS/로컬 파일시스템에 의존하는 복합 렌더링 팩토리**입니다.

## 1. 핵심 아키텍처 (The "Hidden" Structures)

이 앱은 단순한 웹앱이 아니라, 세 가지 서로 다른 런타임이 협력하는 분산 시스템입니다.

### A. 인프라 제약 사항 (Critical Infrastructure)
*   **VPS/로컬 필수 (Not Serverless-Ready)**: `src/app/api/render`와 `download` 라우트는 `os.tmpdir()`와 `public/temp_renders` 로컬 파일시스템을 공유합니다.
    *   **경고**: Vercel Serverless Function 배포 시 렌더링된 파일을 다운로드할 수 없습니다(404 에러 발생). 지속형 스토리지(Persistent FS)가 있는 환경(Docker, VPS)이 필수입니다.
*   **대역폭 헤어핀 (Hairpinning)**: 업스케일링 과정(`upscale/route.ts`)에서 `Supabase -> API Server -> ComfyUI -> API Server -> Supabase`로 대용량 비디오 데이터가 왕복합니다. 네트워크 대역폭이 중요합니다.

### B. 렌더링 엔진 (The Engine Room)
*   **Remotion 서버 사이드 렌더링**: 비디오 병합은 `ffmpeg` 커맨드가 아니라, **Remotion** 리액트 컴포넌트를 서버에서 렌더링하여 수행됩니다.
*   **SSE 스트리밍**: 렌더링 진행 상황(로그, 퍼센트)은 `text/event-stream`을 통해 클라이언트로 실시간 전송됩니다. 이는 단순한 HTTP 요청-응답이 아닌 **"연결 지향적"** 프로세스입니다.
*   **정밀 타이밍 의존성**: TTS 오디오의 길이를 MP3 버퍼 파싱(`getMp3Duration`)을 통해 밀리초 단위로 계산하여 비디오 싱크를 맞춥니다.

## 2. 기능적 깊이 (Feature Depth)

### A. 캐릭터 아이덴티티 시스템 ("Yellow Box Hat")
코드 곳곳에 하드코딩된 **브랜드 정체성**이 숨어 있습니다.
*   **Economy-1 스타일**: "White stickman character with a yellow box hat"이라는 구체적인 지시가 프롬프트 생성 로직(`gemini.ts`)에 박혀 있습니다.
*   **Senior-1 스타일**: "White 3D stickman with a fluffy white beard".
*   **목적**: 컷이 바뀌어도 주인공 캐릭터가 변하지 않도록(Anti-Hallucination) 강제하는 시스템입니다. 이를 함부로 제거하면 영상의 일관성이 무너집니다.

### B. 오토파일럿 데이지 체인 (Daisy-Chain UX)
*   "오토파일럿"은 서버의 상태 기계가 아닙니다.
*   **브라우저 주도**: `Script` -> `Image` -> `Video` -> `Preview` 페이지가 URL 파라미터(`?autopilot=true`)를 통해 서로를 꼬리 물기 식으로 호출합니다.
*   **의존성**: 사용자가 브라우저 탭을 닫으면 전체 파이프라인이 멈춥니다.

### C. 60FPS 리마스터링
*   단순 업스케일링이 아닙니다. `simple_video_upscale_2.0_60F_api.json` 워크플로우를 통해 원본 영상을 **60FPS로 보간(Interpolation)**합니다. 이로 인해 작업 시간이 길어지며(최대 30분 폴링), "Desperation Polling" 패턴이 나타납니다.

## 3. 데이터 흐름 및 기술적 부채

### A. 흩어진 비즈니스 로직 (Scattered Logic)
스타일 정의가 여러 파일에 복제되어 있습니다.
*   `nanobanana.ts`: 이미지 생성용 스타일 프리셋
*   `gemini.ts`: 대본 생성용 비주얼 지시문 (캐릭터 정의 포함)
*   `videoPrompt.ts`: 비디오 생성용 모션 제한 규칙
*   **위험**: 새로운 스타일을 추가하려면 이 3개 파일을 모두 동기화해서 수정해야 합니다.

### B. 언어 교차 파이프라인 (Cross-Language Bridge)
*   사용자가 한국어 대본을 요청해도, 내부적으로 `visual` 묘사는 **반드시 영어**로 생성하여 이미지/비디오 생성기에 전달합니다. 이 "이중 언어 구조"가 앱의 핵심 연결 고리입니다.

### C. 보안 취약점
*   `download/route.ts`는 `os.tmpdir()` 내의 파일을 파일명만으로 서빙합니다. 경로 탐색(..) 방지 로직은 있지만, 파일명 추측 공격(Predictable Filename)에 취약할 수 있습니다.

## 4. 결론 및 행동 강령

1.  **배포 주의**: "이거 Vercel에 올리면 되나요?"라고 묻는다면 **"아니요, 파일시스템 문제로 Docker나 VPS가 필요합니다"**라고 답해야 합니다.
2.  **스타일 수정 금지**: 'Yellow Box Hat' 같은 텍스트를 단순한 예시로 착각하고 삭제하지 마십시오. 이 앱의 핵심 IP(지적 재산)입니다.
3.  **ComfyUI 중심**: 이미지, 비디오, 업스케일링 모두 ComfyUI가 처리합니다. Fal.ai는 잊으십시오.
4.  **클라이언트 존중**: 브라우저 탭이 "오케스트레이터"입니다. UX를 개선한답시고 페이지 이동 로직을 함부로 서버로 옮기면 오토파일럿이 깨집니다.
