# ComfyUI 로컬 설정 가이드

이 가이드는 AutoVideo와 연동하여 무료로 무제한 비디오를 생성하기 위한 로컬 ComfyUI 설정 방법을 설명합니다.

## 1. 사전 준비사항

- **NVIDIA GPU**: LTX-Video 모델 구동을 위해 **12GB 이상의 VRAM** 권장. (최소 8GB)
- **ComfyUI**: 설치 및 실행 완료 (기본 주소: http://127.0.0.1:8188).
- **AutoVideo**: 환경 설정에서 ComfyUI 활성화 필요.

## 2. ComfyUI 설정

### 필수 노드 설치
ComfyUI Manager를 통해 다음 노드들을 설치해 주세요:
- **ComfyUI-VideoHelperSuite**: `VHS_VideoCombine` 노드 사용 (MP4 저장용).
- **ComfyUI-LTXVideo**: LTX-Video 모델 지원용.

### 모델 다운로드
다음 모델 파일을 다운로드하여 `ComfyUI/models/checkpoints/` 폴더에 넣어주세요:
- **LTX-Video (ltxv_13b_fp8_e4m3fn.safetensors)**: [HuggingFace 다운로드 링크](https://huggingface.co/Lightricks/LTX-Video/tree/main)
- (선택) Wan2.1 등 다른 비디오 모델도 호환되는 워크플로우가 있다면 사용 가능합니다.

## 3. AutoVideo 환경 설정

1. AutoVideo 프로젝트 루트의 `.env.local` 파일을 엽니다 (없으면 생성).
2. ComfyUI 주소를 추가합니다:
   ```env
   COMFYUI_BASE_URL=http://127.0.0.1:8188
   ```

## 4. 사용 방법

1. **ComfyUI 실행**: 터미널에서 `python main.py` 실행 (또는 bat 파일 실행).
2. **AutoVideo 실행**: `npm run dev` 실행.
3. **프로젝트 생성**: 새 프로젝트 만들기에서 **ComfyUI (로컬)** 을 선택합니다.
4. 이제 AutoVideo가 로컬 ComfyUI로 프롬프트를 보내고 완성된 비디오를 받아옵니다.

## 5. 문제 해결 (Troubleshooting)

- **CORS 오류**: AutoVideo는 서버 사이드 프록시를 사용하므로 브라우저 CORS 문제는 발생하지 않아야 합니다. 연결 실패 시 포트(8188)가 열려 있는지 확인하세요.
- **노드 없음 오류**: 생성 즉시 실패한다면 ComfyUI 서버 콘솔 로그를 확인하세요. 필수 커스텀 노드가 설치되지 않았을 수 있습니다.
- **메모리 부족 (OOM)**: LTX-Video는 무거운 모델입니다. 실행 중인 다른 GPU 사용 프로그램(게임, 포토샵 등)을 종료하세요.

---
**참고**: 워크플로우 템플릿(JSON)은 `src/lib/video/ComfyUIVideoProvider.ts` 파일 내에 정의되어 있습니다. 다른 모델이나 노드 구성을 사용하려면 이 파일의 JSON 구조를 수정하세요.
