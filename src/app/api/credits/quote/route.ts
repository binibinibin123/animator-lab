import { NextRequest, NextResponse } from 'next/server';
import {
    ACTIVE_PRICING_VERSION,
    getDefaultImageModelId,
    getDefaultVideoModelId,
    isSupportedImageQuality,
    isSupportedVideoResolution,
    isImageModelId,
    isVideoModelId,
    resolveImageQuality,
    resolveVideoResolution,
    quoteImageCredits,
    quoteVideoCredits,
} from '@/lib/models/registry';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode;

    if (mode === 'image') {
        const modelId = isImageModelId(body.modelId) ? body.modelId : getDefaultImageModelId();
        const requestedQuality = body.quality || body.resolution;

        if (!isSupportedImageQuality(modelId, requestedQuality)) {
            return NextResponse.json(
                { error: `Unsupported image quality for model ${modelId}: ${requestedQuality}` },
                { status: 400 }
            );
        }

        const quality = resolveImageQuality(modelId, requestedQuality);
        return NextResponse.json({
            mode,
            modelId,
            quality,
            pricingVersion: ACTIVE_PRICING_VERSION,
            quoteCredits: quoteImageCredits(modelId, quality),
        });
    }

    if (mode === 'video') {
        const modelId = isVideoModelId(body.modelId) ? body.modelId : getDefaultVideoModelId();
        if (!isSupportedVideoResolution(modelId, body.resolution)) {
            return NextResponse.json(
                { error: `Unsupported video resolution for model ${modelId}: ${body.resolution}` },
                { status: 400 }
            );
        }

        const resolution = resolveVideoResolution(modelId, body.resolution);
        const quoteCredits = quoteVideoCredits(modelId, {
            durationSeconds: Number(body.duration || 6),
            resolution,
            audioEnabled: !!body.audioEnabled,
        });

        return NextResponse.json({
            mode,
            modelId,
            resolution,
            pricingVersion: ACTIVE_PRICING_VERSION,
            quoteCredits,
        });
    }

    return NextResponse.json(
        { error: 'mode must be image or video' },
        { status: 400 }
    );
}
