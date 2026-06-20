export type PricingVersion = 'v1';
export type RenderStrategy = 'native' | 'reframe_portrait';
export type ImageQuality = 'low' | 'medium' | 'high';

export type ImageModelId =
    | 'gpt-image-2'
    | 'nano-banana-2'
    | 'nano-banana-pro'
    | 'flux-2-dev'
    | 'flux-2-pro';
export type VideoModelId =
    | 'ltx-2.3-fast'
    | 'seedance-2.0-fast'
    | 'seedance-2.0'
    | 'grok-imagine-video'
    | 'sora-2'
    | 'veo-3.1-lite'
    | 'veo-3.1-fast'
    | 'kling-v3-standard'
    | 'hailuo-2.3-fast-standard'
    | 'hailuo-2.3-fast-pro'
    | 'ltx-2-fast'
    | 'hailuo-02-standard'
    | 'hailuo-02-pro'
    | 'kling-2.6-pro'
    | 'wan-2.5'
    | 'ltx-2.0-pro'
    | 'veo-3-fast';

export type ModelId = ImageModelId | VideoModelId;

export type VideoResolution = 'auto' | '480p' | '720p' | '1080p' | '1440p' | '2160p' | '4k' | '512P' | '768P';
export type ModelPreviewSource = 'curated_sample' | 'official_thumbnail' | 'reference_placeholder' | 'none';
export type LegacyModelPreviewSource = 'fal' | 'local';
export type ImageProviderName = 'gemini' | 'fal';
export type VideoDurationFormat = 'number' | 'seconds-string' | 'string';
export type VideoImageInputKey = 'image_url' | 'start_image_url';

export interface QuoteInput {
    durationSeconds?: number;
    resolution?: VideoResolution;
    audioEnabled?: boolean;
}

export interface VideoInputMapping {
    imageInputKey: VideoImageInputKey;
    durationFormat: VideoDurationFormat;
    resolutionInputKey?: string;
    aspectRatioInputKey?: string;
    staticInput?: Record<string, unknown>;
    omitResolution?: boolean;
    omitDuration?: boolean;
}

const RENDER_STRATEGIES: RenderStrategy[] = ['native', 'reframe_portrait'];

export function isRenderStrategy(value: unknown): value is RenderStrategy {
    return typeof value === 'string' && (RENDER_STRATEGIES as string[]).includes(value);
}

export function resolveRenderStrategy(value: unknown, aspectRatio: string): RenderStrategy {
    if (aspectRatio !== '9:16') {
        return 'native';
    }

    return isRenderStrategy(value) ? value : 'native';
}

export interface ImageModelConfig {
    id: ImageModelId;
    label: string;
    description: string;
    fallbackPreviewImageUrl: string;
    enabled: boolean;
    provider: ImageProviderName;
    endpoint: string;
    editEndpoint?: string;
    providerModel?: string;
    providerModelConfigured: boolean;
    providerDisplayName: string;
    modelDisplayName: string;
    costModeLabel: string;
    supportsReference: boolean;
    defaultImageSize: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
    defaultQuality: ImageQuality;
    baseCreditsPerImage: number;
    supportedQualities: ImageQuality[];
    qualityMultiplier: Partial<Record<ImageQuality, number>>;
    estimatedUsdByQuality?: Partial<Record<ImageQuality, number>>;
}

export interface VideoModelConfig {
    id: VideoModelId;
    label: string;
    description: string;
    fallbackPreviewImageUrl: string;
    enabled: boolean;
    provider: 'fal';
    endpoint: string;
    providerDisplayName: string;
    modelDisplayName: string;
    costModeLabel: string;
    acceptsImageInput: boolean;
    supportedResolutions: VideoResolution[];
    baseCreditsPerSecond: number;
    audioMultiplier: number;
    resolutionMultiplier: Partial<Record<VideoResolution, number>>;
    allowedDurations?: number[];
    inputMapping: VideoInputMapping;
    estimatedUsdPerSecond?: Partial<Record<VideoResolution, number>>;
}

export const ACTIVE_PRICING_VERSION: PricingVersion = 'v1';

export function getPreviewSourceLabel(source?: ModelPreviewSource | LegacyModelPreviewSource): string {
    switch (source) {
        case 'curated_sample':
            return '직접 생성 샘플';
        case 'official_thumbnail':
        case 'fal':
            return 'fal 공식 썸네일';
        case 'reference_placeholder':
        case 'local':
            return '참고 이미지 · 모델 출력 아님';
        case 'none':
        default:
            return '샘플 없음';
    }
}

export const IMAGE_MODEL_REGISTRY: Record<ImageModelId, ImageModelConfig> = {
    'gpt-image-2': {
        id: 'gpt-image-2',
        label: '표준 · GPT Image 2 medium',
        description: 'OpenAI GPT Image 2를 fal.ai에서 실행합니다. 텍스트 정확도와 디테일이 좋아 기본 이미지 컷에 사용합니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'openai/gpt-image-2',
        editEndpoint: 'openai/gpt-image-2/edit',
        providerModelConfigured: true,
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'GPT Image 2',
        costModeLabel: '표준',
        supportsReference: true,
        defaultImageSize: 'landscape_16_9',
        defaultQuality: 'medium',
        baseCreditsPerImage: 55,
        supportedQualities: ['low', 'medium', 'high'],
        qualityMultiplier: {
            low: 0.12,
            medium: 1,
            high: 4,
        },
        estimatedUsdByQuality: {
            low: 0.006,
            medium: 0.053,
            high: 0.211,
        },
    },
    'nano-banana-2': {
        id: 'nano-banana-2',
        label: 'Fallback · 나노 바나나 2',
        description: 'Google Gemini 기반 fallback 이미지 생성 모델입니다. GPT Image 2 장애 시 대체용으로 유지합니다.',
        fallbackPreviewImageUrl: '/styles/illustration.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/nano-banana-2',
        editEndpoint: 'fal-ai/nano-banana-2/edit',
        providerModel: 'fal-ai/nano-banana-2',
        providerModelConfigured: true,
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Nano Banana 2',
        costModeLabel: 'Fallback',
        supportsReference: true,
        defaultImageSize: 'landscape_16_9',
        defaultQuality: 'medium',
        baseCreditsPerImage: 25,
        supportedQualities: ['medium'],
        qualityMultiplier: {
            medium: 1,
        },
        estimatedUsdByQuality: {
            medium: 0.039,
        },
    },
    'nano-banana-pro': {
        id: 'nano-banana-pro',
        label: 'Fallback · 나노 바나나 프로',
        description: 'Google Gemini 기반 고품질 fallback 모델입니다. GPT Image 2와 비교 검증할 때 사용합니다.',
        fallbackPreviewImageUrl: '/styles/realistic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/nano-banana-pro',
        editEndpoint: 'fal-ai/nano-banana-pro/edit',
        providerModel: 'fal-ai/nano-banana-pro',
        providerModelConfigured: true,
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Nano Banana Pro',
        costModeLabel: 'Fallback',
        supportsReference: true,
        defaultImageSize: 'landscape_16_9',
        defaultQuality: 'high',
        baseCreditsPerImage: 40,
        supportedQualities: ['medium', 'high'],
        qualityMultiplier: {
            medium: 1,
            high: 1.8,
        },
        estimatedUsdByQuality: {
            medium: 0.15,
            high: 0.3,
        },
    },
    'flux-2-dev': {
        id: 'flux-2-dev',
        label: '실험 · FLUX.2 dev',
        description: '저비용 대량 초안용 FLUX.2 dev 모델입니다. 스타일 실험과 빠른 초안 컷에 적합합니다.',
        fallbackPreviewImageUrl: '/styles/digital-art.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/flux-2',
        editEndpoint: 'fal-ai/flux-2/edit',
        providerModelConfigured: true,
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'FLUX.2 dev',
        costModeLabel: '실험',
        supportsReference: true,
        defaultImageSize: 'landscape_16_9',
        defaultQuality: 'low',
        baseCreditsPerImage: 14,
        supportedQualities: ['low', 'medium'],
        qualityMultiplier: {
            low: 1,
            medium: 1.8,
        },
        estimatedUsdByQuality: {
            low: 0.012,
            medium: 0.02,
        },
    },
    'flux-2-pro': {
        id: 'flux-2-pro',
        label: '프리미엄 · FLUX.2 pro',
        description: 'FLUX.2 pro 고품질 이미지 모델입니다. 포토리얼 초안과 스타일 변형용 보조 옵션입니다.',
        fallbackPreviewImageUrl: '/styles/realistic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/flux-2-pro',
        editEndpoint: 'fal-ai/flux-2-pro/edit',
        providerModelConfigured: true,
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'FLUX.2 pro',
        costModeLabel: '프리미엄',
        supportsReference: true,
        defaultImageSize: 'landscape_16_9',
        defaultQuality: 'medium',
        baseCreditsPerImage: 36,
        supportedQualities: ['medium', 'high'],
        qualityMultiplier: {
            medium: 1,
            high: 1.8,
        },
        estimatedUsdByQuality: {
            medium: 0.03,
            high: 0.054,
        },
    },
};

export const VIDEO_MODEL_REGISTRY: Record<VideoModelId, VideoModelConfig> = {
    'ltx-2.3-fast': {
        id: 'ltx-2.3-fast',
        label: '기본 · LTX-2.3 Fast',
        description: 'LTX-2.3 Fast 이미지 기반 영상 모델입니다. 빠른 6~20초 컷 생성의 기본값으로 사용합니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/ltx-2.3/image-to-video/fast',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'LTX-2.3 Fast',
        costModeLabel: '기본',
        acceptsImageInput: true,
        supportedResolutions: ['1080p', '1440p', '2160p'],
        baseCreditsPerSecond: 6,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '1080p': 1,
            '1440p': 2,
            '2160p': 4,
        },
        allowedDurations: [6, 8, 10, 12, 14, 16, 18, 20],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
            aspectRatioInputKey: 'aspect_ratio',
            staticInput: { generate_audio: false },
        },
        estimatedUsdPerSecond: {
            '1080p': 0.05,
            '1440p': 0.1,
            '2160p': 0.2,
        },
    },
    'seedance-2.0-fast': {
        id: 'seedance-2.0-fast',
        label: '가성비 · Seedance 2.0 Fast',
        description: 'ByteDance Seedance 2.0 Fast I2V 모델입니다. 480p/720p 컷을 빠르고 저렴하게 대량 생성할 때 사용합니다.',
        fallbackPreviewImageUrl: '/styles/digital-art.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'bytedance/seedance-2.0/fast/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Seedance 2.0 Fast',
        costModeLabel: '가성비',
        acceptsImageInput: true,
        supportedResolutions: ['720p', '480p'],
        baseCreditsPerSecond: 5,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '720p': 1,
            '480p': 0.7,
        },
        allowedDurations: [6, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
            aspectRatioInputKey: 'aspect_ratio',
            staticInput: { generate_audio: false, bitrate_mode: 'standard' },
        },
        estimatedUsdPerSecond: {
            '720p': 0.06,
            '480p': 0.04,
        },
    },
    'seedance-2.0': {
        id: 'seedance-2.0',
        label: '표준 · Seedance 2.0',
        description: 'ByteDance Seedance 2.0 I2V 모델입니다. 1080p까지 지원하는 상위 Seedance 옵션입니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'bytedance/seedance-2.0/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Seedance 2.0',
        costModeLabel: '표준',
        acceptsImageInput: true,
        supportedResolutions: ['720p', '1080p', '480p'],
        baseCreditsPerSecond: 8,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '720p': 1,
            '1080p': 1.7,
            '480p': 0.7,
        },
        allowedDurations: [6, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
            aspectRatioInputKey: 'aspect_ratio',
            staticInput: { generate_audio: false, bitrate_mode: 'standard' },
        },
        estimatedUsdPerSecond: {
            '720p': 0.08,
            '1080p': 0.14,
            '480p': 0.06,
        },
    },
    'grok-imagine-video': {
        id: 'grok-imagine-video',
        label: '가성비 · Grok Imagine Video',
        description: '720p 중심의 가성비 I2V 모델입니다. 빠른 영상 실험과 native audio 후보 검토에 적합합니다.',
        fallbackPreviewImageUrl: '/styles/neon.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'xai/grok-imagine-video/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Grok Imagine Video',
        costModeLabel: '가성비',
        acceptsImageInput: true,
        supportedResolutions: ['480p', '720p'],
        baseCreditsPerSecond: 7,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '480p': 0.7,
            '720p': 1,
        },
        allowedDurations: [6],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
            aspectRatioInputKey: 'aspect_ratio',
        },
        estimatedUsdPerSecond: {
            '720p': 0.07,
        },
    },
    'sora-2': {
        id: 'sora-2',
        label: '프리미엄 · Sora 2',
        description: 'OpenAI Sora 2 I2V 프리미엄 모델입니다. 최종 후보 컷이나 비교 렌더에 사용합니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/sora-2/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Sora 2',
        costModeLabel: '프리미엄',
        acceptsImageInput: true,
        supportedResolutions: ['auto', '720p'],
        baseCreditsPerSecond: 10,
        audioMultiplier: 1,
        resolutionMultiplier: {
            auto: 1,
            '720p': 1,
        },
        allowedDurations: [4, 8, 12, 16, 20],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
            aspectRatioInputKey: 'aspect_ratio',
            staticInput: { delete_video: false, model: 'sora-2' },
        },
        estimatedUsdPerSecond: {
            '720p': 0.1,
        },
    },
    'veo-3.1-lite': {
        id: 'veo-3.1-lite',
        label: '프리미엄 Lite · Veo 3.1 Lite',
        description: 'Google Veo 3.1 Lite I2V 모델입니다. 720p/1080p 4~8초 컷을 Veo 계열에서 비용 절감형으로 생성합니다.',
        fallbackPreviewImageUrl: '/styles/3d-render.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/veo3.1/lite/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Veo 3.1 Lite',
        costModeLabel: 'Lite',
        acceptsImageInput: true,
        supportedResolutions: ['720p', '1080p'],
        baseCreditsPerSecond: 5,
        audioMultiplier: 1.5,
        resolutionMultiplier: {
            '720p': 1,
            '1080p': 2,
        },
        allowedDurations: [8, 4, 6],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'seconds-string',
            resolutionInputKey: 'resolution',
            aspectRatioInputKey: 'aspect_ratio',
            staticInput: { generate_audio: false, safety_tolerance: '4' },
        },
        estimatedUsdPerSecond: {
            '720p': 0.05,
            '1080p': 0.1,
        },
    },
    'veo-3.1-fast': {
        id: 'veo-3.1-fast',
        label: '프리미엄 · Veo 3.1 Fast',
        description: 'Google Veo 3.1 Fast I2V 모델입니다. 16:9/9:16 고품질 모션 테스트용입니다.',
        fallbackPreviewImageUrl: '/styles/3d-render.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/veo3.1/fast/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Veo 3.1 Fast',
        costModeLabel: '프리미엄',
        acceptsImageInput: true,
        supportedResolutions: ['720p', '1080p', '4k'],
        baseCreditsPerSecond: 10,
        audioMultiplier: 1.5,
        resolutionMultiplier: {
            '720p': 1,
            '1080p': 1.5,
            '4k': 4,
        },
        allowedDurations: [4, 6, 8],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'seconds-string',
            resolutionInputKey: 'resolution',
            aspectRatioInputKey: 'aspect_ratio',
            staticInput: { generate_audio: false, safety_tolerance: '4' },
        },
        estimatedUsdPerSecond: {
            '720p': 0.1,
            '1080p': 0.1,
            '4k': 0.4,
        },
    },
    'kling-v3-standard': {
        id: 'kling-v3-standard',
        label: '고급 · Kling v3 Standard',
        description: 'Kling v3 Standard I2V 모델입니다. 정교한 모션과 장면 연출 비교용으로 사용합니다.',
        fallbackPreviewImageUrl: '/styles/realistic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/kling-video/v3/standard/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Kling v3 Standard',
        costModeLabel: '고급',
        acceptsImageInput: true,
        supportedResolutions: ['auto'],
        baseCreditsPerSecond: 8.4,
        audioMultiplier: 1.5,
        resolutionMultiplier: {
            auto: 1,
        },
        allowedDurations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        inputMapping: {
            imageInputKey: 'start_image_url',
            durationFormat: 'number',
            omitResolution: true,
            staticInput: { generate_audio: false, negative_prompt: 'blur, distort, and low quality', cfg_scale: 0.5 },
        },
        estimatedUsdPerSecond: {
            auto: 0.084,
        },
    },
    'hailuo-2.3-fast-standard': {
        id: 'hailuo-2.3-fast-standard',
        label: '가성비 · Hailuo 2.3 Fast Standard',
        description: 'MiniMax Hailuo 2.3 Fast Standard I2V 모델입니다. 768p 빠른 후보 컷 생성용입니다.',
        fallbackPreviewImageUrl: '/styles/illustration.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Hailuo 2.3 Fast Standard',
        costModeLabel: '가성비',
        acceptsImageInput: true,
        supportedResolutions: ['768P'],
        baseCreditsPerSecond: 6,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '768P': 1,
        },
        allowedDurations: [6, 10],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'string',
            omitResolution: true,
            staticInput: { prompt_optimizer: true },
        },
        estimatedUsdPerSecond: {
            '768P': 0.06,
        },
    },
    'hailuo-2.3-fast-pro': {
        id: 'hailuo-2.3-fast-pro',
        label: '고급 · Hailuo 2.3 Fast Pro',
        description: 'MiniMax Hailuo 2.3 Fast Pro I2V 모델입니다. 1080p 후보 컷과 카메라 무빙 비교용입니다.',
        fallbackPreviewImageUrl: '/styles/realistic.png',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Hailuo 2.3 Fast Pro',
        costModeLabel: '고급',
        acceptsImageInput: true,
        supportedResolutions: ['1080p'],
        baseCreditsPerSecond: 8,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '1080p': 1,
        },
        allowedDurations: [6],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            omitResolution: true,
            omitDuration: true,
            staticInput: { prompt_optimizer: true },
        },
        estimatedUsdPerSecond: {
            '1080p': 0.08,
        },
    },
    'ltx-2-fast': {
        id: 'ltx-2-fast',
        label: 'Legacy · LTX-2 고속',
        description: '레거시 LTX-2 Fast 모델입니다. 기존 프로젝트 호환을 위해 유지합니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        enabled: false,
        provider: 'fal',
        endpoint: 'fal-ai/ltx-2/image-to-video/fast',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'LTX-2 Fast',
        costModeLabel: 'Legacy',
        acceptsImageInput: true,
        supportedResolutions: ['1080p', '1440p', '2160p'],
        baseCreditsPerSecond: 6,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '1080p': 1,
            '1440p': 2,
            '2160p': 4,
        },
        allowedDurations: [6, 8, 10, 12, 14, 16, 18, 20],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
        },
    },
    'hailuo-02-standard': {
        id: 'hailuo-02-standard',
        label: 'Legacy · 하이루오 02 스탠다드',
        description: '레거시 Hailuo 02 Standard 모델입니다.',
        fallbackPreviewImageUrl: '/styles/illustration.png',
        enabled: false,
        provider: 'fal',
        endpoint: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Hailuo 02 Standard',
        costModeLabel: 'Legacy',
        acceptsImageInput: true,
        supportedResolutions: ['768P', '512P'],
        baseCreditsPerSecond: 6.666,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '768P': 1,
            '512P': 0.4,
        },
        allowedDurations: [6, 10],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
        },
    },
    'hailuo-02-pro': {
        id: 'hailuo-02-pro',
        label: 'Legacy · 하이루오 02 프로',
        description: '레거시 Hailuo 02 Pro 모델입니다.',
        fallbackPreviewImageUrl: '/styles/realistic.png',
        enabled: false,
        provider: 'fal',
        endpoint: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Hailuo 02 Pro',
        costModeLabel: 'Legacy',
        acceptsImageInput: true,
        supportedResolutions: ['1080p'],
        baseCreditsPerSecond: 8,
        audioMultiplier: 1,
        resolutionMultiplier: { '1080p': 1 },
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
        },
    },
    'kling-2.6-pro': {
        id: 'kling-2.6-pro',
        label: 'Legacy · 클링 2.6 프로',
        description: '레거시 Kling 2.6 Pro 모델입니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        enabled: false,
        provider: 'fal',
        endpoint: 'fal-ai/kling-video/v2.6/pro/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Kling 2.6 Pro',
        costModeLabel: 'Legacy',
        acceptsImageInput: true,
        supportedResolutions: ['1080p'],
        baseCreditsPerSecond: 7,
        audioMultiplier: 2,
        resolutionMultiplier: { '1080p': 1 },
        allowedDurations: [5, 10],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
        },
    },
    'wan-2.5': {
        id: 'wan-2.5',
        label: 'Legacy · 완 2.5',
        description: '레거시 Wan 2.5 모델입니다.',
        fallbackPreviewImageUrl: '/styles/digital-art.png',
        enabled: false,
        provider: 'fal',
        endpoint: 'fal-ai/wan-25-preview/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Wan 2.5',
        costModeLabel: 'Legacy',
        acceptsImageInput: true,
        supportedResolutions: ['480p', '720p', '1080p'],
        baseCreditsPerSecond: 5,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '480p': 1,
            '720p': 2,
            '1080p': 3,
        },
        allowedDurations: [5, 10],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
        },
    },
    'ltx-2.0-pro': {
        id: 'ltx-2.0-pro',
        label: 'Legacy · LTX-2 프로',
        description: '레거시 LTX-2 Pro 모델입니다.',
        fallbackPreviewImageUrl: '/styles/3d-render.png',
        enabled: false,
        provider: 'fal',
        endpoint: 'fal-ai/ltx-2/image-to-video',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'LTX-2 Pro',
        costModeLabel: 'Legacy',
        acceptsImageInput: true,
        supportedResolutions: ['1080p', '1440p', '2160p'],
        baseCreditsPerSecond: 8,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '1080p': 1,
            '1440p': 2,
            '2160p': 4,
        },
        allowedDurations: [6, 8, 10],
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
        },
    },
    'veo-3-fast': {
        id: 'veo-3-fast',
        label: 'Legacy · Veo 3 고속',
        description: '레거시 Veo 3 Fast T2V 모델입니다. 새 I2V 흐름에서는 Veo 3.1 Fast를 사용합니다.',
        fallbackPreviewImageUrl: '/styles/neon.png',
        enabled: false,
        provider: 'fal',
        endpoint: 'fal-ai/veo3/fast',
        providerDisplayName: 'fal.ai',
        modelDisplayName: 'Veo 3 Fast',
        costModeLabel: 'Legacy',
        acceptsImageInput: false,
        supportedResolutions: ['720p', '1080p', '2160p'],
        baseCreditsPerSecond: 10,
        audioMultiplier: 1.5,
        resolutionMultiplier: {
            '720p': 1,
            '1080p': 1,
            '2160p': 3,
        },
        inputMapping: {
            imageInputKey: 'image_url',
            durationFormat: 'number',
            resolutionInputKey: 'resolution',
        },
    },
};

export function isImageModelId(value: unknown): value is ImageModelId {
    return typeof value === 'string' && value in IMAGE_MODEL_REGISTRY;
}

export function isVideoModelId(value: unknown): value is VideoModelId {
    return typeof value === 'string' && value in VIDEO_MODEL_REGISTRY;
}

export function getDefaultImageModelId(): ImageModelId {
    return 'gpt-image-2';
}

export function getDefaultVideoModelId(): VideoModelId {
    return 'ltx-2.3-fast';
}

function normalizeImageQualityInput(requestedQuality?: string): ImageQuality | undefined {
    if (!requestedQuality) {
        return undefined;
    }

    const normalized = requestedQuality.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    const legacyAliases: Record<string, ImageQuality> = {
        '2k': 'medium',
        '4k': 'high',
        standard: 'medium',
        draft: 'low',
        final: 'high',
    };

    const alias = legacyAliases[normalized];
    if (alias) {
        return alias;
    }

    return ['low', 'medium', 'high'].includes(normalized)
        ? (normalized as ImageQuality)
        : undefined;
}

export function resolveImageQuality(modelId: ImageModelId, requestedQuality?: string): ImageQuality {
    const model = IMAGE_MODEL_REGISTRY[modelId];
    const normalized = normalizeImageQualityInput(requestedQuality);
    if (!normalized) {
        return model.defaultQuality;
    }

    return model.supportedQualities.includes(normalized)
        ? normalized
        : model.defaultQuality;
}

export function getSupportedImageQualities(modelId: ImageModelId): ImageQuality[] {
    return IMAGE_MODEL_REGISTRY[modelId].supportedQualities;
}

export function isSupportedImageQuality(modelId: ImageModelId, quality?: string): boolean {
    if (!quality) return true;
    const normalized = normalizeImageQualityInput(quality);
    return !!normalized && IMAGE_MODEL_REGISTRY[modelId].supportedQualities.includes(normalized);
}

export function resolveVideoDuration(modelId: VideoModelId, requestedDuration?: number): number {
    const model = VIDEO_MODEL_REGISTRY[modelId];
    const normalized = Math.max(1, Math.round(requestedDuration || 6));

    if (!model.allowedDurations || model.allowedDurations.length === 0) {
        return normalized === 10 ? 10 : 6;
    }

    if (model.allowedDurations.includes(normalized)) {
        return normalized;
    }

    return model.allowedDurations.reduce((closest, value) => {
        return Math.abs(value - normalized) < Math.abs(closest - normalized) ? value : closest;
    }, model.allowedDurations[0]);
}

export function resolveDefaultVideoDuration(modelId: VideoModelId): number {
    const model = VIDEO_MODEL_REGISTRY[modelId];
    if (model.allowedDurations && model.allowedDurations.length > 0) {
        return model.allowedDurations[0];
    }

    return resolveVideoDuration(modelId, 6);
}

function normalizeVideoResolutionInput(modelId: VideoModelId, requestedResolution?: string): VideoResolution | undefined {
    if (!requestedResolution) {
        return undefined;
    }

    const trimmed = requestedResolution.trim();
    if (!trimmed) {
        return undefined;
    }

    if (modelId === 'hailuo-02-standard' || modelId === 'hailuo-2.3-fast-standard') {
        const hailuoAliases: Record<string, VideoResolution> = {
            '512p': '512P',
            '768p': '768P',
            '720p': '768P',
            '1080p': '768P',
            '480p': '512P',
        };
        const alias = hailuoAliases[trimmed] ?? hailuoAliases[trimmed.toLowerCase()];
        if (alias) {
            return alias;
        }
    }

    const model = VIDEO_MODEL_REGISTRY[modelId];
    return model.supportedResolutions.find(
        (resolution) => resolution.toLowerCase() === trimmed.toLowerCase()
    );
}

export function resolveVideoResolution(modelId: VideoModelId, requestedResolution?: string): VideoResolution {
    const model = VIDEO_MODEL_REGISTRY[modelId];
    const normalized = normalizeVideoResolutionInput(modelId, requestedResolution);
    if (normalized) {
        return normalized;
    }

    if (!requestedResolution || !requestedResolution.trim()) {
        return model.supportedResolutions[0];
    }

    return model.supportedResolutions[0];
}

export function getSupportedVideoResolutions(modelId: VideoModelId): VideoResolution[] {
    return VIDEO_MODEL_REGISTRY[modelId].supportedResolutions;
}

export function isSupportedVideoResolution(modelId: VideoModelId, resolution?: string): boolean {
    if (!resolution) return true;
    return !!normalizeVideoResolutionInput(modelId, resolution);
}

export function quoteImageCredits(modelId: ImageModelId, requestedQuality?: string): number {
    const quality = resolveImageQuality(modelId, requestedQuality);
    const model = IMAGE_MODEL_REGISTRY[modelId];
    const multiplier = model.qualityMultiplier[quality] ?? 1;
    return Math.ceil(model.baseCreditsPerImage * multiplier);
}

export function quoteVideoCredits(modelId: VideoModelId, input: QuoteInput): number {
    const config = VIDEO_MODEL_REGISTRY[modelId];
    const durationSeconds = resolveVideoDuration(modelId, input.durationSeconds);
    const resolution = resolveVideoResolution(modelId, input.resolution);
    const resolutionMultiplier = config.resolutionMultiplier[resolution] ?? 1;
    const audioMultiplier = input.audioEnabled ? config.audioMultiplier : 1;
    const raw = config.baseCreditsPerSecond * durationSeconds * resolutionMultiplier * audioMultiplier;
    return Math.ceil(raw);
}

export function listEnabledImageModels() {
    return Object.values(IMAGE_MODEL_REGISTRY).filter((m) => m.enabled);
}

export function listEnabledVideoModels() {
    return Object.values(VIDEO_MODEL_REGISTRY).filter((m) => m.enabled);
}

export interface ModelRegistryWarning {
    code: 'IMAGE_PROVIDER_MODEL_UNSET' | 'IMAGE_PROVIDER_MODEL_SHARED';
    severity: 'warning';
    message: string;
    modelId?: ImageModelId;
}

export function getImageModelRegistryWarnings(): ModelRegistryWarning[] {
    return [];
}

export interface ImageModelOption {
    id: ImageModelId;
    label: string;
    description: string;
    previewSource: ModelPreviewSource;
    previewSourceLabel: string;
    previewImageUrl?: string;
    fallbackPreviewImageUrl: string;
    provider: ImageProviderName;
    providerDisplayName: string;
    modelDisplayName: string;
    costModeLabel: string;
    supportsReference: boolean;
    defaultQuality: ImageQuality;
    qualities: Array<{
        id: ImageQuality;
        credits: number;
        modeLabel: string;
        estimatedUsd?: number;
    }>;
}

export interface VideoModelOption {
    id: VideoModelId;
    label: string;
    description: string;
    previewSource: ModelPreviewSource;
    previewSourceLabel: string;
    previewImageUrl?: string;
    previewVideoUrl?: string;
    fallbackPreviewImageUrl: string;
    providerDisplayName: string;
    modelDisplayName: string;
    costModeLabel: string;
    defaultDurationSeconds: number;
    resolutions: Array<{
        id: VideoResolution;
        creditsPerCut: number;
        estimatedUsdPerCut?: number;
    }>;
}

export function listImageModelOptions(): ImageModelOption[] {
    return listEnabledImageModels().map((model) => ({
        id: model.id,
        label: model.label,
        description: model.description,
        previewSource: 'reference_placeholder',
        previewSourceLabel: getPreviewSourceLabel('reference_placeholder'),
        previewImageUrl: model.fallbackPreviewImageUrl,
        fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
        provider: model.provider,
        providerDisplayName: model.providerDisplayName,
        modelDisplayName: model.modelDisplayName,
        costModeLabel: model.costModeLabel,
        supportsReference: model.supportsReference,
        defaultQuality: model.defaultQuality,
        qualities: model.supportedQualities.map((quality) => ({
            id: quality,
            credits: quoteImageCredits(model.id, quality),
            modeLabel: quality === 'low' ? '초안' : quality === 'medium' ? '표준' : '최종',
            estimatedUsd: model.estimatedUsdByQuality?.[quality],
        })),
    }));
}

export function listVideoModelOptions(): VideoModelOption[] {
    return listEnabledVideoModels().map((model) => ({
        id: model.id,
        label: model.label,
        description: model.description,
        previewSource: 'reference_placeholder',
        previewSourceLabel: getPreviewSourceLabel('reference_placeholder'),
        previewImageUrl: model.fallbackPreviewImageUrl,
        fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
        providerDisplayName: model.providerDisplayName,
        modelDisplayName: model.modelDisplayName,
        costModeLabel: model.costModeLabel,
        defaultDurationSeconds: resolveDefaultVideoDuration(model.id),
        resolutions: model.supportedResolutions.map((resolution) => ({
            id: resolution,
            creditsPerCut: quoteVideoCredits(model.id, {
                durationSeconds: resolveDefaultVideoDuration(model.id),
                resolution,
                audioEnabled: false,
            }),
            estimatedUsdPerCut: model.estimatedUsdPerSecond?.[resolution] !== undefined
                ? Number((model.estimatedUsdPerSecond[resolution]! * resolveDefaultVideoDuration(model.id)).toFixed(3))
                : undefined,
        })),
    }));
}
