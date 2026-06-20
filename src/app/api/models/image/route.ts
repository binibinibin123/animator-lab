import { NextResponse } from 'next/server';
import {
    getImageModelRegistryWarnings,
    getPreviewSourceLabel,
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
            modeLabel: quality === 'low' ? '초안' : quality === 'medium' ? '표준' : '최종',
            estimatedUsd: model.estimatedUsdByQuality?.[quality],
        }));

        return {
            id: model.id,
            label: model.label,
            description: model.description,
            previewSource: 'reference_placeholder' as const,
            previewSourceLabel: getPreviewSourceLabel('reference_placeholder'),
            previewImageUrl: model.fallbackPreviewImageUrl,
            fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
            provider: model.provider,
            providerDisplayName: model.providerDisplayName,
            modelDisplayName: model.modelDisplayName,
            costModeLabel: model.costModeLabel,
            supportsReference: model.supportsReference,
            defaultQuality: model.defaultQuality,
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

    models.push({
        id: 'local-comfyui-image',
        label: 'Local · ComfyUI Image',
        description: 'Local ComfyUI image workflow placeholder. Enable after wiring a stable image workflow.',
        previewSource: 'local' as const,
        previewSourceLabel: getPreviewSourceLabel('local'),
        previewImageUrl: '/styles/illustration.png',
        fallbackPreviewImageUrl: '/styles/illustration.png',
        provider: 'local',
        providerDisplayName: 'Local ComfyUI',
        modelDisplayName: 'ComfyUI Image Workflow',
        costModeLabel: 'Local',
        supportsReference: true,
        defaultQuality: 'medium',
        providerModelConfigured: Boolean(process.env.COMFYUI_BASE_URL),
        baseCreditsPerImage: 0,
        supportedQualities: ['medium'],
        creditsByQuality: { medium: 0 },
        qualities: [{ id: 'medium', credits: 0, modeLabel: 'Local' }],
        disabled: true,
        offlineReason: process.env.COMFYUI_BASE_URL
            ? 'Image workflow adapter is not wired yet.'
            : 'COMFYUI_BASE_URL is not configured.',
    } as any);

    return NextResponse.json({
        pricingVersion: pricingContext.pricingVersion,
        pricingSource: pricingContext.source,
        warnings: getImageModelRegistryWarnings(),
        models,
    });
}
