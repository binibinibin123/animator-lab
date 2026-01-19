# AutoVideo 개발 세션 로그 - 2026년 1월 20일

## 📋 작업 개요

오늘은 이미지 생성 기능의 버그 수정 및 사용자 경험 개선에 집중했습니다.

---

## ✅ 완료된 작업

### 1. 이미지 삭제 기능 추가
**파일:** `src/app/project/[id]/image/page.tsx`

- 생성된 이미지를 삭제할 수 있는 기능 추가
- 삭제 버튼 (🗑️ 아이콘) 이미지 미리보기 영역에 추가
- `/api/segment/update` 엔드포인트를 통해 `image_url`을 `null`로 설정
- 삭제 확인 다이얼로그 포함

### 2. 스타일 썸네일 경로 수정
**파일:** `src/app/create/new/page.tsx`

- `economy-1` 스타일 썸네일이 `.jpg` 확장자를 가리키고 있었으나, 실제 파일은 `.png`
- `/styles/economy-1.jpg` → `/styles/economy-1.png` 수정

### 3. 이미지 생성 시 로딩 오버레이 개선
**파일:** `src/app/project/[id]/image/page.tsx`

- "전체 생성" 시 로딩 스피너가 모든 이미지를 가리는 문제 해결
- `currentGeneratingId` 상태 추가하여 현재 생성 중인 컷만 오버레이 표시
- 완료된 이미지는 즉시 확인 가능

### 4. 이미지 프롬프트 환각(Hallucination) 문제 해결
**파일:** `src/lib/ai/nanobanana.ts`

**문제:** 생성된 이미지에 프롬프트와 무관하게 "돈을 들고 있는" 캐릭터가 반복적으로 등장

**원인 분석:**
1. 스타일 프롬프트에 "Dollar sign ($)" 키워드가 있어 AI가 "돈/지폐"를 연상
2. 캐릭터 외형을 자세히 묘사하면서 불필요한 환각 유발

**해결:**
```typescript
// Before
'economy-1': 'A cute white stickman character with a yellow square hat displaying Won symbol (₩), simple flat vector illustration style, bright cheerful colors, Korean financial and economic theme, educational cartoon for YouTube'

// After
'economy-1': 'Simple flat vector illustration style, clean background.'
```

- 캐릭터 설명 완전 제거 (레퍼런스 이미지가 전달하므로 불필요)
- 돈 관련 키워드 모두 삭제
- 레퍼런스 지시사항 단순화:
  ```
  "IMPORTANT: Keep the character's identity from the reference image. Follow the scene description above for action and pose."
  ```

### 5. "전체 생성" 시 동일 이미지 생성 버그 수정
**파일:** `src/app/project/[id]/image/page.tsx`

**문제:** 개별 생성은 정상 작동하나, "전체 생성" 시 모든 컷이 비슷한 이미지로 생성됨

**원인:**
- `handleGenerateAll`이 `handleGenerateImage`를 호출할 때 공유된 `customPrompt` 상태 사용
- 첫 번째 생성 후 `customPrompt`가 빈 문자열로 리셋되어 후속 컷들이 동일 조건으로 생성

**해결:**
```typescript
// handleGenerateAll 내에서 직접 API 호출
body: JSON.stringify({
    prompt: segment.visual_description || undefined, // 각 segment의 고유한 visual_description 사용
    scriptText: segment.script_text,
    segmentId: segment.id,
    resolution,
    style: projectStyle,
}),
```

---

## 📁 수정된 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/app/project/[id]/image/page.tsx` | 수정 | 이미지 삭제, 로딩 개선, 전체생성 버그 수정 |
| `src/app/create/new/page.tsx` | 수정 | 스타일 썸네일 경로 수정 (.jpg → .png) |
| `src/lib/ai/nanobanana.ts` | 수정 | 스타일 프롬프트 단순화, 환각 문제 해결 |
| `public/styles/economy-1.png` | 추가 | 새 레퍼런스 이미지 추가 |

---

## 🔧 기술적 교훈

1. **AI 프롬프트 설계**: 키워드가 의도치 않은 환각을 유발할 수 있음. "Dollar"라는 단어만으로도 "돈을 들고 있는" 행동이 생성됨.

2. **레퍼런스 이미지 활용**: 캐릭터 외형은 레퍼런스 이미지로 전달하고, 텍스트 프롬프트는 **행동/장면** 설명에만 집중하는 것이 효과적.

3. **상태 관리 주의**: React 상태를 공유하는 함수 간 호출 시, 상태 변경 타이밍에 주의 필요. `handleGenerateAll`에서 `handleGenerateImage`를 반복 호출할 때 상태 오염 발생.

---

## 📌 다음 세션 TODO

- [ ] 대시보드 프로젝트 관리 기능 (삭제, 이름 변경, 스마트 네비게이션)
- [ ] 이미지 생성 품질 추가 테스트
- [ ] 비디오 생성 워크플로우 안정화

---

**총 작업 시간:** ~1시간 30분
