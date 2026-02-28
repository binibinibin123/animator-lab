import { NextResponse } from 'next/server';
import { listEnabledVideoModels } from '@/lib/models/registry';

export async function GET() {
    return NextResponse.json({
        pricingVersion: 'v1',
        models: listEnabledVideoModels().map((model) => ({
            id: model.id,
            label: model.label,
            baseCreditsPerSecond: model.baseCreditsPerSecond,
            acceptsImageInput: model.acceptsImageInput,
            audioMultiplier: model.audioMultiplier,
        })),
    });
}
