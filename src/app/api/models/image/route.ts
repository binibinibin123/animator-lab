import { NextResponse } from 'next/server';
import { listEnabledImageModels } from '@/lib/models/registry';

export async function GET() {
    return NextResponse.json({
        pricingVersion: 'v1',
        models: listEnabledImageModels().map((model) => ({
            id: model.id,
            label: model.label,
            baseCreditsPerImage: model.baseCreditsPerImage,
        })),
    });
}
