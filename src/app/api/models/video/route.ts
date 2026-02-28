import { NextResponse } from 'next/server';
import { listEnabledVideoModels, quoteVideoCredits } from '@/lib/models/registry';

export async function GET() {
    return NextResponse.json({
        pricingVersion: 'v1',
        models: listEnabledVideoModels().map((model) => ({
            id: model.id,
            label: model.label,
            baseCreditsPerSecond: model.baseCreditsPerSecond,
            acceptsImageInput: model.acceptsImageInput,
            audioMultiplier: model.audioMultiplier,
            supportedResolutions: model.supportedResolutions,
            creditsPerSixSecondsByResolution: model.supportedResolutions.reduce((acc, resolution) => {
                acc[resolution] = quoteVideoCredits(model.id, {
                    durationSeconds: 6,
                    resolution,
                    audioEnabled: false,
                });
                return acc;
            }, {} as Record<string, number>),
        })),
    });
}
