import { NextRequest, NextResponse } from 'next/server';
import {
    ACTIVE_PRICING_VERSION,
    getDefaultImageModelId,
    getDefaultVideoModelId,
    isImageModelId,
    isVideoModelId,
    quoteImageCredits,
    quoteVideoCredits,
} from '@/lib/models/registry';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode;

    if (mode === 'image') {
        const modelId = isImageModelId(body.modelId) ? body.modelId : getDefaultImageModelId();
        return NextResponse.json({
            mode,
            modelId,
            pricingVersion: ACTIVE_PRICING_VERSION,
            quoteCredits: quoteImageCredits(modelId),
        });
    }

    if (mode === 'video') {
        const modelId = isVideoModelId(body.modelId) ? body.modelId : getDefaultVideoModelId();
        const quoteCredits = quoteVideoCredits(modelId, {
            durationSeconds: Number(body.duration || 6),
            resolution: body.resolution || '1080p',
            audioEnabled: !!body.audioEnabled,
        });

        return NextResponse.json({
            mode,
            modelId,
            pricingVersion: ACTIVE_PRICING_VERSION,
            quoteCredits,
        });
    }

    return NextResponse.json(
        { error: 'mode must be image or video' },
        { status: 400 }
    );
}
