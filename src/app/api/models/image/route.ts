import { NextResponse } from 'next/server';
import { listEnabledImageModels, quoteImageCredits } from '@/lib/models/registry';

export async function GET() {
    return NextResponse.json({
        pricingVersion: 'v1',
        models: listEnabledImageModels().map((model) => ({
            id: model.id,
            label: model.label,
            baseCreditsPerImage: model.baseCreditsPerImage,
            supportedQualities: model.supportedQualities,
            creditsByQuality: model.supportedQualities.reduce((acc, quality) => {
                acc[quality] = quoteImageCredits(model.id, quality);
                return acc;
            }, {} as Record<string, number>),
        })),
    });
}
