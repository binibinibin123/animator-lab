export type PricingVersion = 'v1';
export type RenderStrategy = 'native' | 'reframe_portrait';
export type ImageQuality = '2K' | '4K';

export type ImageModelId = 'nano-banana-2' | 'nano-banana-pro';
export type VideoModelId =
    | 'ltx-2-fast'
    | 'hailuo-02-standard'
    | 'hailuo-02-pro'
    | 'kling-2.6-pro'
    | 'wan-2.5'
    | 'ltx-2.0-pro'
    | 'veo-3-fast';

export type ModelId = ImageModelId | VideoModelId;

export type VideoResolution = '480p' | '720p' | '1080p' | '1440p' | '2160p' | '512P' | '768P';
export type ModelPreviewSource = 'fal' | 'local' | 'none';

export interface QuoteInput {
    durationSeconds?: number;
    resolution?: VideoResolution;
    audioEnabled?: boolean;
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
    provider: 'gemini';
    providerModel: string;
    providerModelConfigured: boolean;
    baseCreditsPerImage: number;
    supportedQualities: ImageQuality[];
    qualityMultiplier: Partial<Record<ImageQuality, number>>;
}

export interface VideoModelConfig {
    id: VideoModelId;
    label: string;
    description: string;
    fallbackPreviewImageUrl: string;
    fallbackPreviewVideoUrl?: string;
    enabled: boolean;
    provider: 'fal';
    endpoint: string;
    acceptsImageInput: boolean;
    supportedResolutions: VideoResolution[];
    baseCreditsPerSecond: number;
    audioMultiplier: number;
    resolutionMultiplier: Partial<Record<VideoResolution, number>>;
    allowedDurations?: number[];
}

export const ACTIVE_PRICING_VERSION: PricingVersion = 'v1';

export const IMAGE_MODEL_REGISTRY: Record<ImageModelId, ImageModelConfig> = {
    'nano-banana-2': {
        id: 'nano-banana-2',
        label: '나노 바나나 2',
        description: 'Google Gemini 기반 고속 이미지 생성 모델. 2K 품질로 빠르게 컷 이미지를 만듭니다.',
        fallbackPreviewImageUrl: '/styles/illustration.png',
        enabled: true,
        provider: 'gemini',
        providerModel: 'gemini-3.1-flash-image-preview',
        providerModelConfigured: true,
        baseCreditsPerImage: 25,
        supportedQualities: ['2K'],
        qualityMultiplier: {
            '2K': 1,
        },
    },
    'nano-banana-pro': {
        id: 'nano-banana-pro',
        label: '나노 바나나 프로',
        description: 'Google Gemini 기반 고품질 이미지 생성 모델. 2K/4K 품질 선택으로 디테일을 강화할 수 있습니다.',
        fallbackPreviewImageUrl: '/styles/realistic.png',
        enabled: true,
        provider: 'gemini',
        providerModel: 'gemini-3-pro-image-preview',
        providerModelConfigured: true,
        baseCreditsPerImage: 40,
        supportedQualities: ['2K', '4K'],
        qualityMultiplier: {
            '2K': 1,
            '4K': 1.8,
        },
    },
};

export const VIDEO_MODEL_REGISTRY: Record<VideoModelId, VideoModelConfig> = {
    'ltx-2-fast': {
        id: 'ltx-2-fast',
        label: 'LTX-2 고속',
        description: '이미지 기반 I2V에 최적화된 고속 모델입니다. 빠른 처리로 짧은 컷을 대량 생성할 때 유리합니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        fallbackPreviewVideoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/ltx-2/image-to-video/fast',
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
    },
    'hailuo-02-standard': {
        id: 'hailuo-02-standard',
        label: '하이루오 02 스탠다드',
        description: '균형형 I2V 모델로 자연스러운 모션 표현에 강점이 있습니다. 6초 숏컷 제작에 적합합니다.',
        fallbackPreviewImageUrl: '/styles/illustration.png',
        fallbackPreviewVideoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
        acceptsImageInput: true,
        supportedResolutions: ['768P', '512P'],
        baseCreditsPerSecond: 6.666,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '768P': 1,
            '512P': 0.4,
        },
        allowedDurations: [6, 10],
    },
    'hailuo-02-pro': {
        id: 'hailuo-02-pro',
        label: '하이루오 02 프로',
        description: 'Hailuo 계열의 고해상도 I2V 모델입니다. 1080p 품질 중심으로 안정적인 결과를 제공합니다.',
        fallbackPreviewImageUrl: '/styles/realistic.png',
        fallbackPreviewVideoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
        acceptsImageInput: true,
        supportedResolutions: ['1080p'],
        baseCreditsPerSecond: 8,
        audioMultiplier: 1,
        resolutionMultiplier: { '1080p': 1 },
    },
    'kling-2.6-pro': {
        id: 'kling-2.6-pro',
        label: '클링 2.6 프로',
        description: '정교한 장면 연출에 특화된 I2V 모델입니다. 시네마틱한 움직임이 필요한 컷에 적합합니다.',
        fallbackPreviewImageUrl: '/styles/cinematic.png',
        fallbackPreviewVideoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/kling-video/v2.6/pro/image-to-video',
        acceptsImageInput: true,
        supportedResolutions: ['1080p'],
        baseCreditsPerSecond: 7,
        audioMultiplier: 2,
        resolutionMultiplier: { '1080p': 1 },
        allowedDurations: [5, 10],
    },
    'wan-2.5': {
        id: 'wan-2.5',
        label: '완 2.5',
        description: '가벼운 비용으로 다양한 해상도를 선택할 수 있는 I2V 모델입니다. 실험용/대량 제작에 적합합니다.',
        fallbackPreviewImageUrl: '/styles/digital-art.png',
        fallbackPreviewVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/wan-25-preview/image-to-video',
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
    },
    'ltx-2.0-pro': {
        id: 'ltx-2.0-pro',
        label: 'LTX-2 프로',
        description: 'LTX 고품질 라인업으로 1080p~4K 해상도를 지원합니다. 결과 품질 우선 작업에 적합합니다.',
        fallbackPreviewImageUrl: '/styles/3d-render.png',
        fallbackPreviewVideoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/ltx-2/image-to-video',
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
    },
    'veo-3-fast': {
        id: 'veo-3-fast',
        label: 'Veo 3 고속',
        description: '텍스트 기반 T2V 중심 모델입니다. 음성 옵션을 포함한 고급 샷 생성에 활용할 수 있습니다.',
        fallbackPreviewImageUrl: '/styles/neon.png',
        fallbackPreviewVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/veo3/fast',
        acceptsImageInput: false,
        supportedResolutions: ['720p', '1080p', '2160p'],
        baseCreditsPerSecond: 10,
        audioMultiplier: 1.5,
        resolutionMultiplier: {
            '720p': 1,
            '1080p': 1,
            '2160p': 3,
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
    return 'nano-banana-2';
}

export function getDefaultVideoModelId(): VideoModelId {
    return 'ltx-2-fast';
}

export function resolveImageQuality(modelId: ImageModelId, requestedQuality?: string): ImageQuality {
    const model = IMAGE_MODEL_REGISTRY[modelId];
    if (!requestedQuality) {
        return model.supportedQualities[0];
    }

    return model.supportedQualities.includes(requestedQuality as ImageQuality)
        ? (requestedQuality as ImageQuality)
        : model.supportedQualities[0];
}

export function getSupportedImageQualities(modelId: ImageModelId): ImageQuality[] {
    return IMAGE_MODEL_REGISTRY[modelId].supportedQualities;
}

export function isSupportedImageQuality(modelId: ImageModelId, quality?: string): boolean {
    if (!quality) return true;
    return IMAGE_MODEL_REGISTRY[modelId].supportedQualities.includes(quality as ImageQuality);
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

    if (modelId === 'hailuo-02-standard') {
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
    previewImageUrl?: string;
    fallbackPreviewImageUrl: string;
    qualities: Array<{
        id: ImageQuality;
        credits: number;
    }>;
}

export interface VideoModelOption {
    id: VideoModelId;
    label: string;
    description: string;
    previewSource: ModelPreviewSource;
    previewImageUrl?: string;
    previewVideoUrl?: string;
    fallbackPreviewImageUrl: string;
    fallbackPreviewVideoUrl?: string;
    defaultDurationSeconds: number;
    resolutions: Array<{
        id: VideoResolution;
        creditsPerCut: number;
    }>;
}

export function listImageModelOptions(): ImageModelOption[] {
    return listEnabledImageModels().map((model) => ({
        id: model.id,
        label: model.label,
        description: model.description,
        previewSource: 'local',
        previewImageUrl: model.fallbackPreviewImageUrl,
        fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
        qualities: model.supportedQualities.map((quality) => ({
            id: quality,
            credits: quoteImageCredits(model.id, quality),
        })),
    }));
}

export function listVideoModelOptions(): VideoModelOption[] {
    return listEnabledVideoModels().map((model) => ({
        id: model.id,
        label: model.label,
        description: model.description,
        previewSource: 'local',
        previewImageUrl: model.fallbackPreviewImageUrl,
        previewVideoUrl: model.fallbackPreviewVideoUrl,
        fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
        fallbackPreviewVideoUrl: model.fallbackPreviewVideoUrl,
        defaultDurationSeconds: resolveDefaultVideoDuration(model.id),
        resolutions: model.supportedResolutions.map((resolution) => ({
            id: resolution,
            creditsPerCut: quoteVideoCredits(model.id, {
                durationSeconds: resolveDefaultVideoDuration(model.id),
                resolution,
                audioEnabled: false,
            }),
        })),
    }));
}
