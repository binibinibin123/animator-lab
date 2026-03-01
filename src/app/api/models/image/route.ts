import { NextResponse } from 'next/server';
import {
    getImageModelRegistryWarnings,
    listEnabledImageModels,
} from '@/lib/models/registry';
import { createServerClient } from '@/lib/supabase';
import { loadPricingContext, quoteImageCreditsWithContext } from '@/lib/credits/pricing';

export async function GET() {
    const supabase = createServerClient();
    const pricingContext = await loadPricingContext(supabase);

    const models = listEnabledImageModels().map((model) => {
        const qualities = model.supportedQualities.map((quality) => ({
            id: quality,
            credits: quoteImageCreditsWithContext(pricingContext, model.id, quality).quoteCredits,
        }));

        return {
            id: model.id,
            label: model.label,
            description: model.description,
            previewSource: 'local' as const,
            previewImageUrl: model.fallbackPreviewImageUrl,
            fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
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
        pricingVersion: pricingContext.pricingVersion,
        pricingSource: pricingContext.source,
        warnings: getImageModelRegistryWarnings(),
        models,
    });
}
