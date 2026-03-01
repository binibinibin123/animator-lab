import { NextResponse } from 'next/server';
import { ACTIVE_PRICING_VERSION, listEnabledVideoModels, quoteVideoCredits } from '@/lib/models/registry';
import { fetchFalModelPreviews } from '@/lib/video/falModelMetadata';

export async function GET() {
    const enabledModels = listEnabledVideoModels();
    const falPreviewMap = await fetchFalModelPreviews(enabledModels.map((model) => model.endpoint));

    const models = enabledModels.map((model) => {
        const resolutions = model.supportedResolutions.map((resolution) => ({
            id: resolution,
            creditsPerCut: quoteVideoCredits(model.id, {
                durationSeconds: 6,
                resolution,
                audioEnabled: false,
            }),
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
