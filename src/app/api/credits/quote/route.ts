import { NextRequest, NextResponse } from 'next/server';
import {
    getDefaultImageModelId,
    getDefaultVideoModelId,
    isSupportedImageQuality,
    isSupportedVideoResolution,
    isImageModelId,
    isVideoModelId,
    resolveImageQuality,
    resolveVideoResolution,
} from '@/lib/models/registry';
import { createServerClient } from '@/lib/supabase';
import {
    DEFAULT_TTS_MODEL_ID,
    loadPricingContext,
    quoteImageCreditsWithContext,
    quoteTtsCreditsWithContext,
    quoteVideoCreditsWithContext,
} from '@/lib/credits/pricing';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode;
    const supabase = createServerClient();
    const pricingContext = await loadPricingContext(supabase, typeof body.pricingVersion === 'string' ? body.pricingVersion : undefined);

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
        const quote = quoteImageCreditsWithContext(pricingContext, modelId, quality);
        return NextResponse.json({
            mode,
            modelId,
            quality,
            pricingVersion: quote.pricingVersion,
            pricingSource: pricingContext.source,
            quoteCredits: quote.quoteCredits,
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
        const quote = quoteVideoCreditsWithContext(pricingContext, modelId, {
            durationSeconds: Number(body.duration || 6),
            resolution,
            audioEnabled: !!body.audioEnabled,
        });

        return NextResponse.json({
            mode,
            modelId,
            resolution: quote.resolvedResolution,
            requestedDurationSeconds: Number(body.duration || 6),
            resolvedDurationSeconds: quote.resolvedDurationSeconds,
            pricingVersion: quote.pricingVersion,
            pricingSource: pricingContext.source,
            quoteCredits: quote.quoteCredits,
        });
    }

    if (mode === 'tts') {
        const text = typeof body.text === 'string' ? body.text : '';
        const quote = quoteTtsCreditsWithContext(pricingContext, {
            text,
            modelId: typeof body.modelId === 'string' && body.modelId.trim() ? body.modelId : DEFAULT_TTS_MODEL_ID,
        });

        return NextResponse.json({
            mode,
            modelId: quote.modelId,
            pricingVersion: quote.pricingVersion,
            pricingSource: pricingContext.source,
            billableCharacters: quote.billableCharacters,
            quoteCredits: quote.quoteCredits,
        });
    }

    return NextResponse.json(
        { error: 'mode must be image, video, or tts' },
        { status: 400 }
    );
}
