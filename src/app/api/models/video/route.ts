import { NextResponse } from 'next/server';
import { listEnabledVideoModels, resolveDefaultVideoDuration } from '@/lib/models/registry';
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
        }));

        const falPreview = falPreviewMap[model.endpoint];
        const previewImageUrl = falPreview?.previewImageUrl || model.fallbackPreviewImageUrl;
        const previewVideoUrl = falPreview?.previewVideoUrl || model.fallbackPreviewVideoUrl;
        const previewSource = falPreview?.previewImageUrl || falPreview?.previewVideoUrl ? 'fal' : 'local';

        return {
            id: model.id,
            label: model.label,
            description: model.description,
            previewSource,
            previewImageUrl,
            previewVideoUrl,
            fallbackPreviewImageUrl: model.fallbackPreviewImageUrl,
            fallbackPreviewVideoUrl: model.fallbackPreviewVideoUrl,
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

    return NextResponse.json({
        pricingVersion: pricingContext.pricingVersion,
        pricingSource: pricingContext.source,
        models,
    });
}
