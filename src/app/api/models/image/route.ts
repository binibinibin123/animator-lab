import { NextResponse } from 'next/server';
import {
    ACTIVE_PRICING_VERSION,
    getImageModelRegistryWarnings,
    listEnabledImageModels,
    quoteImageCredits,
} from '@/lib/models/registry';

export async function GET() {
    const models = listEnabledImageModels().map((model) => {
        const qualities = model.supportedQualities.map((quality) => ({
            id: quality,
            credits: quoteImageCredits(model.id, quality),
        }));

        return {
            id: model.id,
            label: model.label,
            description: model.description,
            providerModelConfigured: model.providerModelConfigured,
            baseCreditsPerImage: model.baseCreditsPerImage,
            supportedQualities: model.supportedQualities,
            creditsByQuality: qualities.reduce((acc, quality) => {
                acc[quality.id] = quality.credits;
                return acc;
            }, {} as Record<string, number>),
            qualities,
        };
    });

    return NextResponse.json({
        pricingVersion: ACTIVE_PRICING_VERSION,
        warnings: getImageModelRegistryWarnings(),
        models,
    });
}
