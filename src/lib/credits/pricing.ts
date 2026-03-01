import {
    ACTIVE_PRICING_VERSION,
    IMAGE_MODEL_REGISTRY,
    VIDEO_MODEL_REGISTRY,
    quoteImageCredits,
    quoteVideoCredits,
    resolveImageQuality,
    resolveVideoDuration,
    resolveVideoResolution,
    type ImageModelId,
    type QuoteInput,
    type VideoModelId,
    type VideoResolution,
} from '@/lib/models/registry';

type PricingSource = 'db' | 'registry';

interface ImagePricingOverride {
    baseCreditsPerImage?: number;
    qualityMultiplier?: Record<string, number>;
}

interface VideoPricingOverride {
    baseCreditsPerSecond?: number;
    audioMultiplier?: number;
    resolutionMultiplier?: Record<string, number>;
    allowedDurations?: number[];
}

interface PricingConfig {
    image?: Record<string, ImagePricingOverride>;
    video?: Record<string, VideoPricingOverride>;
}

interface PricingVersionRow {
    id?: string;
    config?: unknown;
}

interface PricingQueryResult {
    data: unknown;
    error: unknown;
}

interface PricingQueryBuilder {
    eq: (column: string, value: unknown) => PricingQueryBuilder;
    order: (column: string, options: { ascending: boolean }) => PricingQueryBuilder;
    limit: (count: number) => PricingQueryBuilder;
    maybeSingle: () => Promise<PricingQueryResult>;
}

interface PricingClient {
    from: (table: string) => {
        select: (columns: string) => PricingQueryBuilder;
    };
}

export interface PricingContext {
    pricingVersion: string;
    source: PricingSource;
    config: PricingConfig | null;
}

export interface ImageQuoteResult {
    quoteCredits: number;
    pricingVersion: string;
}

export interface VideoQuoteResult {
    quoteCredits: number;
    pricingVersion: string;
    resolvedDurationSeconds: number;
    resolvedResolution: VideoResolution;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toNumberMap(value: unknown): Record<string, number> {
    if (!isObject(value)) {
        return {};
    }

    const entries = Object.entries(value)
        .filter(([, numeric]) => typeof numeric === 'number' && Number.isFinite(numeric));

    return Object.fromEntries(entries) as Record<string, number>;
}

function toDurationList(value: unknown): number[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const normalized = value
        .filter((entry) => typeof entry === 'number' && Number.isFinite(entry))
        .map((entry) => Math.round(entry))
        .filter((entry) => entry > 0);

    if (normalized.length === 0) {
        return undefined;
    }

    return Array.from(new Set(normalized));
}

function normalizeImageOverride(value: unknown): ImagePricingOverride | null {
    if (!isObject(value)) {
        return null;
    }

    const baseCreditsPerImage = typeof value.baseCreditsPerImage === 'number' && Number.isFinite(value.baseCreditsPerImage)
        ? value.baseCreditsPerImage
        : undefined;
    const qualityMultiplier = toNumberMap(value.qualityMultiplier);

    if (baseCreditsPerImage === undefined && Object.keys(qualityMultiplier).length === 0) {
        return null;
    }

    return {
        ...(baseCreditsPerImage !== undefined ? { baseCreditsPerImage } : {}),
        ...(Object.keys(qualityMultiplier).length > 0 ? { qualityMultiplier } : {}),
    };
}

function normalizeVideoOverride(value: unknown): VideoPricingOverride | null {
    if (!isObject(value)) {
        return null;
    }

    const baseCreditsPerSecond = typeof value.baseCreditsPerSecond === 'number' && Number.isFinite(value.baseCreditsPerSecond)
        ? value.baseCreditsPerSecond
        : undefined;
    const audioMultiplier = typeof value.audioMultiplier === 'number' && Number.isFinite(value.audioMultiplier)
        ? value.audioMultiplier
        : undefined;
    const resolutionMultiplier = toNumberMap(value.resolutionMultiplier);
    const allowedDurations = toDurationList(value.allowedDurations);

    if (
        baseCreditsPerSecond === undefined
        && audioMultiplier === undefined
        && Object.keys(resolutionMultiplier).length === 0
        && !allowedDurations
    ) {
        return null;
    }

    return {
        ...(baseCreditsPerSecond !== undefined ? { baseCreditsPerSecond } : {}),
        ...(audioMultiplier !== undefined ? { audioMultiplier } : {}),
        ...(Object.keys(resolutionMultiplier).length > 0 ? { resolutionMultiplier } : {}),
        ...(allowedDurations ? { allowedDurations } : {}),
    };
}

function normalizePricingConfig(raw: unknown): PricingConfig | null {
    if (!isObject(raw)) {
        return null;
    }

    const image = isObject(raw.image)
        ? Object.fromEntries(
            Object.entries(raw.image)
                .map(([modelId, config]) => [modelId, normalizeImageOverride(config)])
                .filter(([, config]) => !!config)
        ) as Record<string, ImagePricingOverride>
        : undefined;

    const video = isObject(raw.video)
        ? Object.fromEntries(
            Object.entries(raw.video)
                .map(([modelId, config]) => [modelId, normalizeVideoOverride(config)])
                .filter(([, config]) => !!config)
        ) as Record<string, VideoPricingOverride>
        : undefined;

    if ((!image || Object.keys(image).length === 0) && (!video || Object.keys(video).length === 0)) {
        return null;
    }

    return {
        ...(image && Object.keys(image).length > 0 ? { image } : {}),
        ...(video && Object.keys(video).length > 0 ? { video } : {}),
    };
}

function resolveDurationWithAllowed(requestedDuration: number | undefined, allowedDurations: number[] | undefined): number {
    const normalized = Math.max(1, Math.round(requestedDuration || 6));
    if (!allowedDurations || allowedDurations.length === 0) {
        return normalized;
    }

    if (allowedDurations.includes(normalized)) {
        return normalized;
    }

    return allowedDurations.reduce((closest, value) => {
        return Math.abs(value - normalized) < Math.abs(closest - normalized) ? value : closest;
    }, allowedDurations[0]);
}

export async function loadPricingContext(supabase: unknown, requestedPricingVersion?: string): Promise<PricingContext> {
    if (!supabase) {
        return {
            pricingVersion: requestedPricingVersion || ACTIVE_PRICING_VERSION,
            source: 'registry',
            config: null,
        };
    }

    try {
        const client = supabase as PricingClient;
        let query = client
            .from('pricing_versions')
            .select('id, config')
            .limit(1);

        if (requestedPricingVersion) {
            query = query.eq('id', requestedPricingVersion);
        } else {
            query = query
                .eq('is_active', true)
                .order('created_at', { ascending: false });
        }

        const { data, error } = await query.maybeSingle();
        if (error || !data) {
            return {
                pricingVersion: requestedPricingVersion || ACTIVE_PRICING_VERSION,
                source: 'registry',
                config: null,
            };
        }

        const row = data as PricingVersionRow;
        return {
            pricingVersion: typeof row.id === 'string' && row.id.trim() ? row.id : (requestedPricingVersion || ACTIVE_PRICING_VERSION),
            source: 'db',
            config: normalizePricingConfig(row.config),
        };
    } catch {
        return {
            pricingVersion: requestedPricingVersion || ACTIVE_PRICING_VERSION,
            source: 'registry',
            config: null,
        };
    }
}

export function getDefaultVideoDurationSeconds(modelId: VideoModelId, context?: PricingContext): number {
    const override = context?.config?.video?.[modelId];
    if (override?.allowedDurations?.length) {
        return override.allowedDurations[0];
    }

    return resolveVideoDuration(modelId, 6);
}

export function quoteImageCreditsWithContext(
    context: PricingContext,
    modelId: ImageModelId,
    requestedQuality?: string,
): ImageQuoteResult {
    const quality = resolveImageQuality(modelId, requestedQuality);
    const modelConfig = IMAGE_MODEL_REGISTRY[modelId];
    const override = context.config?.image?.[modelId];

    if (!override) {
        return {
            quoteCredits: quoteImageCredits(modelId, quality),
            pricingVersion: context.pricingVersion,
        };
    }

    const baseCredits = override.baseCreditsPerImage ?? modelConfig.baseCreditsPerImage;
    const overrideMultiplier = override.qualityMultiplier?.[quality];
    const multiplier = typeof overrideMultiplier === 'number'
        ? overrideMultiplier
        : (modelConfig.qualityMultiplier[quality] ?? 1);

    return {
        quoteCredits: Math.ceil(baseCredits * multiplier),
        pricingVersion: context.pricingVersion,
    };
}

export function quoteVideoCreditsWithContext(
    context: PricingContext,
    modelId: VideoModelId,
    input: QuoteInput,
): VideoQuoteResult {
    const resolvedResolution = resolveVideoResolution(modelId, input.resolution);
    const override = context.config?.video?.[modelId];

    if (!override) {
        const resolvedDurationSeconds = resolveVideoDuration(modelId, input.durationSeconds);
        return {
            quoteCredits: quoteVideoCredits(modelId, {
                ...input,
                durationSeconds: resolvedDurationSeconds,
                resolution: resolvedResolution,
            }),
            pricingVersion: context.pricingVersion,
            resolvedDurationSeconds,
            resolvedResolution,
        };
    }

    const registryVideoConfig = VIDEO_MODEL_REGISTRY[modelId];
    const allowedDurations = override.allowedDurations ?? registryVideoConfig.allowedDurations;
    const resolvedDurationSeconds = resolveDurationWithAllowed(input.durationSeconds, allowedDurations);
    const baseCreditsPerSecond = override.baseCreditsPerSecond ?? registryVideoConfig.baseCreditsPerSecond;
    const audioMultiplier = input.audioEnabled
        ? (override.audioMultiplier ?? registryVideoConfig.audioMultiplier)
        : 1;
    const overrideResolutionMultiplier = override.resolutionMultiplier?.[resolvedResolution];
    const resolutionMultiplier = typeof overrideResolutionMultiplier === 'number'
        ? overrideResolutionMultiplier
        : (registryVideoConfig.resolutionMultiplier[resolvedResolution] ?? 1);

    return {
        quoteCredits: Math.ceil(baseCreditsPerSecond * resolvedDurationSeconds * resolutionMultiplier * audioMultiplier),
        pricingVersion: context.pricingVersion,
        resolvedDurationSeconds,
        resolvedResolution,
    };
}
