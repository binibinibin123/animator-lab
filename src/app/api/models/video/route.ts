import { NextResponse } from 'next/server';
import { ACTIVE_PRICING_VERSION, listEnabledVideoModels, quoteVideoCredits } from '@/lib/models/registry';

export async function GET() {
    const models = listEnabledVideoModels().map((model) => {
        const resolutions = model.supportedResolutions.map((resolution) => ({
            id: resolution,
            creditsPerCut: quoteVideoCredits(model.id, {
                durationSeconds: 6,
                resolution,
                audioEnabled: false,
            }),
        }));

        return {
            id: model.id,
            label: model.label,
            description: model.description,
            baseCreditsPerSecond: model.baseCreditsPerSecond,
            acceptsImageInput: model.acceptsImageInput,
            audioMultiplier: model.audioMultiplier,
            supportedResolutions: model.supportedResolutions,
            creditsPerSixSecondsByResolution: resolutions.reduce((acc, resolution) => {
                acc[resolution.id] = resolution.creditsPerCut;
                return acc;
            }, {} as Record<string, number>),
            resolutions,
        };
    });

    return NextResponse.json({
        pricingVersion: ACTIVE_PRICING_VERSION,
        models,
    });
}
