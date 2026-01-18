# 📅 Session Log: 2026-01-19 (AutoVideo Project)

## ✅ Completed Tasks (완료된 작업)

### 1. **Phase 1.5: 콘텐츠 품질 고도화**
- **스타일 프리셋 12종 구현**: Anime, Cinematic, 3D Render 등 다양한 스타일을 `public/styles`에 추가하고 선택 UI를 개선했습니다.
- **Reference Image 연동**: 스타일 선택 시 해당 스타일의 대표 이미지를 AI 프롬프트 생성(Gemini)에 함께 전달하여 스타일 일관성을 확보했습니다.
- **Image Page 개선**: 컷별 프롬프트 수정 및 개별 이미지 재생성 기능을 추가했습니다.

### 2. **Phase 3: Autopilot (Beta)**
- **오토파일럿 로직 구현**: 주제 입력 한 번으로 `Script` -> `Audio` -> `Image` -> `Video` 까지 자동 생성되는 파이프라인(SSE 기반)을 구축했습니다.
- **베타 라벨링**: 안정성 확보 전까지 'Beta' 딱지를 붙이고 별도 메뉴(`create/autopilot`)로 분리했습니다.

### 3. **Critical Bug Fixes (긴급 패치)**
- **Project ID Persistence**:
    - 페이지 이동 시 `projectId`가 유실되거나 문자열 "null"로 오염되는 문제를 해결했습니다.
    - `Script`, `Voice`, `Image` 각 페이지에 ID 유효성 검사 로직을 강화했습니다.
- **Data Safety**:
    - "대본 사라짐" 현상의 원인이었던 **공격적인 자동 리다이렉트**를 제거했습니다.
    - 대신 경고 메시지를 띄우도록 변경하여, 데이터 로딩 중 튕겨나가는 문제를 방지했습니다.
- **Debug Tooling**:
    - `/create/debug` 페이지를 신설하여 사용자가 직접 DB 데이터(세그먼트 보존 여부)를 눈으로 확인할 수 있게 했습니다.

---

## 🚧 Work in Progress (진행 중 / 해결 과제)

### 1. **Image Generation Error (500)**
- **증상**: 이미지 생성 시도 시 500 에러 발생. 디버그 페이지에서 테스트 가능.
- **추정 원인**:
    - `GOOGLE_AI_API_KEY` 환경 변수 누락 가능성.
    - Gemini 2.5 Flash Image 모델 접근 권한 혹은 할당량 문제.
    - `nanobanana.ts` 내부의 에러 핸들링 미흡.
- **다음 단계**: API 키 확인 및 서버 로그를 통해 정확한 에러 메시지(403, 404 등) 확인 필요.

### 2. **Navigation Flow Polish**
- **증상**: 리다이렉트를 제거했으나, 유효하지 않은 ID로 접근 시 빈 화면이나 에러 UI가 다소 투박함.
- **다음 단계**: "프로젝트를 찾을 수 없습니다"와 같은 친절한 안내 페이지(Empty State) 디자인 적용 필요.

---

## 📝 Next Steps for Future Session (다음 작업 계획)

1.  **이미지 생성 기능 정상화**:
    - 디버그 페이지의 'API 테스트' 결과를 바탕으로 Gemini 연동 문제 해결.
    - 필요시 Fal.ai 등 대체 엔진 검토.

2.  **Phase 2: 에셋 라이브러리 구축**:
    - 외부 이미지/영상 업로드 기능 구현.

3.  **Phase 4: 최종 렌더링 (FFmpeg)**:
    - 생성된 이미지+오디오를 합쳐 실제 비디오 파일(.mp4)로 병합하는 백엔드 로직 구현.
