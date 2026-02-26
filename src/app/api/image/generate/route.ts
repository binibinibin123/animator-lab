import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';
import { generateImage, scriptToImagePrompt } from '@/lib/ai/nanobanana';
import { generateVideoPrompt } from '@/lib/ai/videoPrompt';
import { ResolverError, resolveReferenceContext } from '@/lib/image/referenceResolver';

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
    const session = await auth();
    if (!session?.user) {
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
        } = body;

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

        const result = await generateImage({
            prompt: imagePrompt,
            style: resolved.effectiveStylePreset || 'anime',
            styleText: resolved.effectiveStyleText,
            aspectRatio: aspectRatio || '16:9',
            resolution: resolution || '2K',
            referenceImage: resolved.referenceImage || undefined,
            referenceMimeType: resolved.referenceMimeType || 'image/png',
            referenceIntent: resolved.referenceIntent,
        });

        let generatedVideoPrompt = null;
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
                .update({ image_url: result.imageUrl } as never)
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

        return NextResponse.json({
            success: true,
            imageUrl: result.imageUrl,
            videoPrompt: generatedVideoPrompt,
            width: result.width,
            height: result.height,
            warnings: resolved.warnings,
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
