import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { createServerClient } from '@/lib/supabase';
import { generateImage, scriptToImagePrompt, type ImageResult } from '@/lib/ai/nanobanana';
import { generateVideoPrompt } from '@/lib/ai/videoPrompt';
import { ResolverError, resolveReferenceContext } from '@/lib/image/referenceResolver';
import {
    ACTIVE_PRICING_VERSION,
    getDefaultImageModelId,
    getSupportedImageQualities,
    isSupportedImageQuality,
    isImageModelId,
    quoteImageCredits,
    resolveImageQuality,
} from '@/lib/models/registry';
import { finalizeCredits, releaseReservedCredits, reserveCredits } from '@/lib/credits/ledger';

function errorResponse(status: number, code: string, message: string, details?: unknown) {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                ...(details !== undefined ? { details } : {}),
            },
        },
        { status }
    );
}

// POST /api/image/generate - Generate image for a segment
export async function POST(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    console.log('[Image API] Received request');

    try {
        const body = await request.json();
        const {
            prompt,
            scriptText,
            style,
            styleText,
            aspectRatio,
            resolution,
            segmentId,
            projectId,
            modelId,
        } = body;

        const resolvedModelId = isImageModelId(modelId) ? modelId : getDefaultImageModelId();
        const requestedQuality = resolution;

        if (!isSupportedImageQuality(resolvedModelId, requestedQuality)) {
            return errorResponse(400, 'INVALID_INPUT', 'Unsupported image quality', {
                modelId: resolvedModelId,
                requestedQuality,
                supportedQualities: getSupportedImageQualities(resolvedModelId),
            });
        }

        const resolvedQuality = resolveImageQuality(resolvedModelId, requestedQuality);

        if (!segmentId && !projectId) {
            return errorResponse(400, 'INVALID_INPUT', 'segmentId or projectId is required');
        }

        const resolved = await resolveReferenceContext({
            projectId,
            segmentId,
            styleOverride: style,
            styleTextOverride: styleText,
        });

        const imagePrompt =
            prompt || scriptToImagePrompt(scriptText || '', resolved.effectiveStylePreset || 'anime');

        if (!imagePrompt) {
            return errorResponse(400, 'INVALID_INPUT', 'Prompt or scriptText is required');
        }

        resolved.warnings.forEach((warning) => {
            console.warn(warning);
        });

        const quotedCredits = quoteImageCredits(resolvedModelId, resolvedQuality);
        const operationId = request.headers.get('x-idempotency-key') || randomUUID();

        const reserveResult = await reserveCredits({
            supabase: createServerClient(),
            projectId: resolved.projectId,
            operationId,
            amount: quotedCredits,
            modelId: resolvedModelId,
            pricingVersion: ACTIVE_PRICING_VERSION,
            details: {
                segmentId: segmentId || null,
                quality: resolvedQuality,
                aspectRatio: aspectRatio || '16:9',
            },
        });

        if (reserveResult.insufficient) {
            return errorResponse(402, 'INVALID_INPUT', 'Insufficient credits', {
                requiredCredits: quotedCredits,
                remainingCredits: reserveResult.remainingCredits,
            });
        }

        let result: ImageResult;
        try {
            result = await generateImage({
                prompt: imagePrompt,
                style: resolved.effectiveStylePreset || 'anime',
                styleText: resolved.effectiveStyleText,
                aspectRatio: aspectRatio || '16:9',
                resolution: resolvedQuality,
                referenceImage: resolved.referenceImage || undefined,
                referenceMimeType: resolved.referenceMimeType || 'image/png',
                referenceIntent: resolved.referenceIntent,
                modelId: resolvedModelId,
            });
        } catch (generationError) {
            await releaseReservedCredits({
                supabase: createServerClient(),
                operationId,
                projectId: resolved.projectId,
                modelId: resolvedModelId,
                pricingVersion: ACTIVE_PRICING_VERSION,
                details: { reason: 'image_generation_failed' },
            });
            throw generationError;
        }

        let generatedVideoPrompt = null;
        try {
            try {
                const videoPromptResult = await generateVideoPrompt({
                    imageUrl: result.imageUrl,
                    scriptText: scriptText,
                    visualDescription: prompt,
                    style: resolved.effectiveStylePreset,
                });
                generatedVideoPrompt = videoPromptResult.prompt;
            } catch (vpError) {
                console.error('[Image API] Failed to generate video prompt:', vpError);
                generatedVideoPrompt = 'Static scene. Fixed camera. Subtle ambient motion.';
            }

            if (segmentId) {
                const supabase = createServerClient();

                const { error: imageError } = await supabase
                    .from('segments')
                    .update({
                        image_url: result.imageUrl,
                        image_model: resolvedModelId,
                        last_quote_credits: quotedCredits,
                    } as never)
                    .eq('id', segmentId);

                if (imageError) {
                    throw new Error('Failed to save image URL to database');
                }

                if (generatedVideoPrompt) {
                    const { error: promptError } = await supabase
                        .from('segments')
                        .update({ video_prompt: generatedVideoPrompt } as never)
                        .eq('id', segmentId);

                    if (promptError) {
                        console.warn('[Image API] Failed to update video_prompt:', promptError.message);
                    }
                }

                const { data: segmentData } = await supabase
                    .from('segments')
                    .select('order_index, project_id')
                    .eq('id', segmentId)
                    .single();

                const segment = segmentData as { order_index: number; project_id: string } | null;
                if (segment && segment.order_index === 0) {
                    const { error: thumbnailError } = await supabase
                        .from('projects')
                        .update({ thumbnail_url: result.imageUrl } as never)
                        .eq('id', segment.project_id);

                    if (thumbnailError) {
                        console.warn('[Image API] Failed to update project thumbnail:', thumbnailError.message);
                    }
                }
            }

            await finalizeCredits({
                supabase: createServerClient(),
                operationId,
                projectId: resolved.projectId,
                modelId: resolvedModelId,
                pricingVersion: ACTIVE_PRICING_VERSION,
                details: {
                    segmentId: segmentId || null,
                },
            });
        } catch (postProcessError) {
            await releaseReservedCredits({
                supabase: createServerClient(),
                operationId,
                projectId: resolved.projectId,
                modelId: resolvedModelId,
                pricingVersion: ACTIVE_PRICING_VERSION,
                details: { reason: 'image_postprocess_failed' },
            });
            throw postProcessError;
        }

        return NextResponse.json({
            success: true,
            imageUrl: result.imageUrl,
            videoPrompt: generatedVideoPrompt,
            width: result.width,
            height: result.height,
            warnings: resolved.warnings,
            modelId: resolvedModelId,
            quality: resolvedQuality,
            quoteCredits: quotedCredits,
            pricingVersion: ACTIVE_PRICING_VERSION,
            remainingCredits: reserveResult.remainingCredits,
        });
    } catch (error: any) {
        if (error instanceof ResolverError) {
            return errorResponse(error.status, error.code, error.message, error.details);
        }

        console.error('Image generation error:', error);

        let errorMessage = 'Failed to generate image';
        if (error.message?.includes('API key')) errorMessage = 'API 키가 설정되지 않았습니다.';
        else if (error.message?.includes('timout')) errorMessage = '생성 시간이 초과되었습니다.';

        return errorResponse(500, 'INTERNAL_ERROR', errorMessage, error.message);
    }
}
