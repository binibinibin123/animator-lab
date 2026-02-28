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

export type VideoResolution = '480p' | '720p' | '1080p' | '1440p' | '2160p';

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
    enabled: boolean;
    provider: 'gemini';
    providerModel: string;
    baseCreditsPerImage: number;
    supportedQualities: ImageQuality[];
    qualityMultiplier: Partial<Record<ImageQuality, number>>;
}

export interface VideoModelConfig {
    id: VideoModelId;
    label: string;
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
        label: 'Nano Banana 2',
        enabled: true,
        provider: 'gemini',
        providerModel: process.env.NANOBANANA_2_MODEL_NAME || 'gemini-2.5-flash-image',
        baseCreditsPerImage: 25,
        supportedQualities: ['2K'],
        qualityMultiplier: {
            '2K': 1,
        },
    },
    'nano-banana-pro': {
        id: 'nano-banana-pro',
        label: 'Nano Banana Pro',
        enabled: true,
        provider: 'gemini',
        providerModel: process.env.NANOBANANA_PRO_MODEL_NAME || 'gemini-2.5-flash-image',
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
        label: 'Standard Eco (LTX Fast)',
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
        label: 'Standard Balanced (Hailuo 02 Standard)',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
        acceptsImageInput: true,
        supportedResolutions: ['720p', '1080p'],
        baseCreditsPerSecond: 6.666,
        audioMultiplier: 1,
        resolutionMultiplier: {
            '720p': 1,
            '1080p': 1,
        },
        allowedDurations: [6],
    },
    'hailuo-02-pro': {
        id: 'hailuo-02-pro',
        label: 'Hailuo 02 Pro (Legacy)',
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
        label: 'Kling 2.6 Pro (Legacy)',
        enabled: true,
        provider: 'fal',
        endpoint: 'fal-ai/kling-video/v2.6/pro/image-to-video',
        acceptsImageInput: true,
        supportedResolutions: ['1080p'],
        baseCreditsPerSecond: 7,
        audioMultiplier: 2,
        resolutionMultiplier: { '1080p': 1 },
    },
    'wan-2.5': {
        id: 'wan-2.5',
        label: 'Wan 2.5 (Legacy)',
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
    },
    'ltx-2.0-pro': {
        id: 'ltx-2.0-pro',
        label: 'Standard Plus (LTX Pro)',
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
        label: 'Veo 3 Fast (Legacy)',
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

export function resolveVideoResolution(modelId: VideoModelId, requestedResolution?: string): VideoResolution {
    const model = VIDEO_MODEL_REGISTRY[modelId];
    if (!requestedResolution) {
        return model.supportedResolutions[0];
    }

    return model.supportedResolutions.includes(requestedResolution as VideoResolution)
        ? (requestedResolution as VideoResolution)
        : model.supportedResolutions[0];
}

export function getSupportedVideoResolutions(modelId: VideoModelId): VideoResolution[] {
    return VIDEO_MODEL_REGISTRY[modelId].supportedResolutions;
}

export function isSupportedVideoResolution(modelId: VideoModelId, resolution?: string): boolean {
    if (!resolution) return true;
    return VIDEO_MODEL_REGISTRY[modelId].supportedResolutions.includes(resolution as VideoResolution);
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
