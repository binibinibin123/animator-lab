import { NextResponse } from 'next/server';
import {
    getPreviewSourceLabel,
    listEnabledVideoModels,
    type ModelPreviewSource,
    resolveDefaultVideoDuration,
} from '@/lib/models/registry';
import { createServerClient } from '@/lib/supabase';
import { getDefaultVideoDurationSeconds, loadPricingContext, quoteVideoCreditsWithContext } from '@/lib/credits/pricing';
import { fetchFalModelPreviews } from '@/lib/video/falModelMetadata';

export async function GET() {
    const supabase = createServerClient();
    const pricingContext = await loadPricingContext(supabase);
    const enabledModels = listEnabledVideoModels();
    const falPreviewMap = await fetchFalModelPreviews(enabledModels.map((model) => model.endpoint));

    const models = enabledModels.map((model) => {
        const defaultDurationSeconds = getDefaultVideoDurationSeconds(model.id, pricingContext);

        const resolutions = model.supportedResolutions.map((resolution) => ({
            id: resolution,
            creditsPerCut: quoteVideoCreditsWithContext(pricingContext, model.id, {
                durationSeconds: defaultDurationSeconds,
                resolution,
                audioEnabled: false,
            }).quoteCredits,
            estimatedUsdPerCut: model.estimatedUsdPerSecond?.[resolution] !== undefined
                ? Number((model.estimatedUsdPerSecond[resolution]! * defaultDurationSeconds).toFixed(3))
                : undefined,
        }));

        const falPreview = falPreviewMap[model.endpoint];
        const hasOfficialPreview = Boolean(falPreview?.previewImageUrl || falPreview?.previewVideoUrl);
        const previewSource: ModelPreviewSource = hasOfficialPreview ? 'official_thumbnail' : 'reference_placeholder';
        const previewImageUrl = falPreview?.previewImageUrl || model.fallbackPreviewImageUrl;
        const previewVideoUrl = falPreview?.previewVideoUrl;

        return {
            id: model.id,
            label: model.label,
            description: model.description,
            previewSource,
            previewSourceLabel: getPreviewSourceLabel(previewSource),
            previewImageUrl,
            previewVideoUrl,
            fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
            providerDisplayName: model.providerDisplayName,
            modelDisplayName: model.modelDisplayName,
            costModeLabel: model.costModeLabel,
            baseCreditsPerSecond: model.baseCreditsPerSecond,
            acceptsImageInput: model.acceptsImageInput,
            audioMultiplier: model.audioMultiplier,
            supportedResolutions: model.supportedResolutions,
            defaultDurationSeconds: defaultDurationSeconds || resolveDefaultVideoDuration(model.id),
            creditsByResolution: resolutions.reduce((acc, resolution) => {
                acc[resolution.id] = resolution.creditsPerCut;
                return acc;
            }, {} as Record<string, number>),
            creditsPerSixSecondsByResolution: resolutions.reduce((acc, resolution) => {
                acc[resolution.id] = resolution.creditsPerCut;
                return acc;
            }, {} as Record<string, number>),
            resolutions,
        };
    });

    models.push({
        id: 'local-comfyui-ltx-2.3',
        label: 'Local · ComfyUI LTX 2.3',
        description: 'Local ComfyUI LTX 2.3 workflow slot for 1280x720 animation motion tests.',
        previewSource: 'local' as const,
        previewSourceLabel: getPreviewSourceLabel('local'),
        previewImageUrl: '/styles/cinematic.png',
        providerDisplayName: 'Local ComfyUI',
        modelDisplayName: 'LTX 2.3 Local Workflow',
        costModeLabel: 'Local',
        baseCreditsPerSecond: 0,
        acceptsImageInput: true,
        audioMultiplier: 1,
        supportedResolutions: ['720p'],
        defaultDurationSeconds: 4,
        creditsByResolution: { '720p': 0 },
        creditsPerSixSecondsByResolution: { '720p': 0 },
        resolutions: [{ id: '720p', creditsPerCut: 0 }],
        disabled: true,
        offlineReason: process.env.COMFYUI_BASE_URL
            ? 'ComfyUI LTX workflow adapter is not wired yet.'
            : 'COMFYUI_BASE_URL is not configured.',
    } as any);

    return NextResponse.json({
        pricingVersion: pricingContext.pricingVersion,
        pricingSource: pricingContext.source,
        models,
    });
}
