// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { createServerClient } from '@/lib/supabase';
import { generateScript } from '@/lib/ai/gemini';
import { generateImage } from '@/lib/ai/nanobanana';
import { parseCreateVisualMode, normalizeStyleInput } from '@/lib/api/visualModeValidation';
import { resolveReferenceContext } from '@/lib/image/referenceResolver';
import {
    ACTIVE_PRICING_VERSION,
    getDefaultImageModelId,
    getDefaultVideoModelId,
    getSupportedImageQualities,
    isSupportedImageQuality,
    isImageModelId,
    resolveRenderStrategy,
    isVideoModelId,
    quoteImageCredits,
    resolveImageQuality,
} from '@/lib/models/registry';
import { finalizeCredits, releaseReservedCredits, reserveCredits } from '@/lib/credits/ledger';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ASPECT_RATIOS = ['16:9', '1:1', '3:4', '9:16'] as const;

function parseAspectRatio(value: unknown, fallback: (typeof ASPECT_RATIOS)[number] = '9:16') {
    return typeof value === 'string' && (ASPECT_RATIOS as readonly string[]).includes(value)
        ? value
        : fallback;
}

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

function isSchemaMissingColumnError(error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    return message.includes('schema cache') && message.includes('Could not find the');
}

export async function POST(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const body = await request.json();
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const duration = Number(body.duration || 60);
    const rawStyle = body.style ?? 'anime';
    const rawStyleText = body.styleText;
    const imageModelId = isImageModelId(body.imageModelId) ? body.imageModelId : getDefaultImageModelId();
    const videoModelId = isVideoModelId(body.videoModelId) ? body.videoModelId : getDefaultVideoModelId();
    const imageQualityInput = body.imageQuality || body.imageResolution;
    const aspectRatio = parseAspectRatio(body.aspectRatio, '9:16');
    const renderStrategy = resolveRenderStrategy(body.renderStrategy, aspectRatio);
    if (!isSupportedImageQuality(imageModelId, imageQualityInput)) {
        return errorResponse(400, 'INVALID_INPUT', 'Unsupported image quality', {
            modelId: imageModelId,
            requestedQuality: imageQualityInput,
            supportedQualities: getSupportedImageQualities(imageModelId),
        });
    }
    const imageQuality = resolveImageQuality(imageModelId, imageQualityInput);

    if (!topic) {
        return errorResponse(400, 'INVALID_INPUT', 'topic is required');
    }

    const visualMode = parseCreateVisualMode(body.visualMode);
    if (visualMode === null) {
        return errorResponse(400, 'INVALID_VISUAL_MODE', 'Invalid visual mode value');
    }

    const normalizedStyle = normalizeStyleInput(rawStyle, rawStyleText);
    const scriptStyle = normalizedStyle.style === 'custom' ? 'informative' : normalizedStyle.style;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            const sendLog = (message: string) => sendEvent('log', { message });
            const sendProgress = (progress: number) => sendEvent('progress', { progress });

            let createdProjectId: string | null = null;

            try {
                sendLog(`🚀 Starting Autopilot for topic: ${topic}`);
                sendProgress(5);

                const supabase = createServerClient();
                const modernProjectInsert = {
                    title: topic,
                    topic,
                    style: normalizedStyle.style,
                    style_text: normalizedStyle.styleText,
                    image_model: imageModelId,
                    video_model: videoModelId,
                    aspect_ratio: aspectRatio,
                    render_strategy: renderStrategy,
                    visual_mode: visualMode,
                    character_reference_url: body.characterReferenceUrl || null,
                    style_reference_url: body.styleReferenceUrl || null,
                    status: 'script',
                    autopilot_status: 'generating_script',
                    autopilot_progress: 5,
                } as any;

                let { data: project, error: projectError } = await supabase
                    .from('projects')
                    .insert(modernProjectInsert)
                    .select()
                    .single();

                if ((!project || projectError) && isSchemaMissingColumnError(projectError)) {
                    sendLog('⚠️ DB schema is behind. Retrying project insert with legacy-safe columns.');
                    const legacyProjectInsert = {
                        title: topic,
                        topic,
                        style: normalizedStyle.style,
                        aspect_ratio: aspectRatio,
                        status: 'script',
                        autopilot_status: 'generating_script',
                        autopilot_progress: 5,
                    } as any;

                    const retryResult = await supabase
                        .from('projects')
                        .insert(legacyProjectInsert)
                        .select()
                        .single();

                    project = retryResult.data;
                    projectError = retryResult.error;
                }

                if (projectError || !project) {
                    throw new Error(`Failed to create project: ${projectError?.message || 'Unknown error'}`);
                }

                createdProjectId = project.id;
                sendEvent('project_created', { projectId: project.id });

                sendLog('✍️ Writing script with Gemini...');
                await delay(600);

                const scriptResult = await generateScript(topic, duration, scriptStyle);
                sendProgress(20);
                sendLog(`✅ Script generated: "${scriptResult.title}" (${scriptResult.segments.length} segments)`);

                const segmentsToInsert = scriptResult.segments.map((seg: any, index: number) => ({
                    project_id: project.id,
                    order_index: index,
                    script_text: seg.text,
                    visual_description: seg.visual || seg.text,
                    duration_ms: seg.estimatedDurationMs,
                }));

                const { data: segmentsData, error: segmentError } = await supabase
                    .from('segments')
                    .insert(segmentsToInsert)
                    .select()
                    .order('order_index', { ascending: true });

                const segments = segmentsData || [];

                if (segmentError || !segments.length) {
                    throw new Error('Failed to save script segments');
                }

                await supabase
                    .from('projects')
                    .update({
                        status: 'voice',
                        autopilot_status: 'generating_voice',
                        autopilot_progress: 25,
                    })
                    .eq('id', project.id);

                sendProgress(25);
                sendLog('🎙️ Voice step in autopilot is currently best-effort (phase 1).');

                for (const segment of segments) {
                    sendLog(`⚠️ TTS skipped for segment ${segment.order_index + 1}. Using estimated duration.`);
                    await delay(200);
                }

                await supabase
                    .from('projects')
                    .update({
                        status: 'image',
                        autopilot_status: 'generating_images',
                        autopilot_progress: 50,
                    })
                    .eq('id', project.id);

                sendProgress(50);
                sendLog('🎨 Generating images...');

                const resolved = await resolveReferenceContext({
                    projectId: project.id,
                    styleOverride: normalizedStyle.style,
                    styleTextOverride: normalizedStyle.styleText || undefined,
                });

                if (!resolved.referenceImage && visualMode === 'character_fixed') {
                    sendLog('⚠️ Character reference image is missing. Output may be less consistent.');
                }

                resolved.warnings.forEach((warning) => {
                    sendLog(`⚠️ ${warning}`);
                });

                let completedImageCount = 0;
                for (const segment of segments) {
                    sendLog(`🖼️ Generating image ${segment.order_index + 1}/${segments.length}`);
                    const operationId = `autopilot:image:${project.id}:${segment.id}`;
                    const quotedCredits = quoteImageCredits(imageModelId, imageQuality);

                    try {
                        const reserveResult = await reserveCredits({
                            supabase,
                            projectId: project.id,
                            operationId,
                            amount: quotedCredits,
                            modelId: imageModelId,
                            pricingVersion: ACTIVE_PRICING_VERSION,
                            details: {
                                segmentId: segment.id,
                                source: 'autopilot',
                            },
                        });

                        if (reserveResult.insufficient) {
                            sendLog(`❌ Not enough credits for image ${segment.order_index + 1}. Required: ${quotedCredits}`);
                            completedImageCount += 1;
                            continue;
                        }

                        const imageResult = await generateImage({
                            prompt: segment.visual_description || segment.script_text,
                            style: resolved.effectiveStylePreset || 'anime',
                            styleText: resolved.effectiveStyleText,
                            aspectRatio,
                            resolution: imageQuality,
                            referenceImage: resolved.referenceImage || undefined,
                            referenceMimeType: resolved.referenceMimeType || 'image/png',
                            referenceIntent: resolved.referenceIntent,
                            modelId: imageModelId,
                        });

                        const segmentUpdate = await supabase
                            .from('segments')
                            .update({
                                image_url: imageResult.imageUrl,
                                image_model: imageModelId,
                                last_quote_credits: quotedCredits,
                            } as never)
                            .eq('id', segment.id);

                        if (segmentUpdate.error) {
                            if (isSchemaMissingColumnError(segmentUpdate.error)) {
                                sendLog(`⚠️ Segment schema is behind. Falling back to image_url-only update for cut ${segment.order_index + 1}.`);
                                const fallbackSegmentUpdate = await supabase
                                    .from('segments')
                                    .update({
                                        image_url: imageResult.imageUrl,
                                    } as never)
                                    .eq('id', segment.id);

                                if (fallbackSegmentUpdate.error) {
                                    throw new Error(fallbackSegmentUpdate.error.message || 'Failed to update segment image_url');
                                }
                            } else {
                                throw new Error(segmentUpdate.error.message || 'Failed to update segment image data');
                            }
                        }

                        await finalizeCredits({
                            supabase,
                            operationId,
                            projectId: project.id,
                            modelId: imageModelId,
                            pricingVersion: ACTIVE_PRICING_VERSION,
                            details: {
                                segmentId: segment.id,
                                source: 'autopilot',
                            },
                        });
                    } catch (imageError: any) {
                        sendLog(`❌ Image generation failed for segment ${segment.order_index + 1}: ${imageError.message}`);
                        await releaseReservedCredits({
                            supabase,
                            operationId,
                            projectId: project.id,
                            modelId: imageModelId,
                            pricingVersion: ACTIVE_PRICING_VERSION,
                            details: {
                                segmentId: segment.id,
                                reason: 'autopilot_image_failed',
                            },
                        });
                    }

                    completedImageCount += 1;
                    const progress = 50 + Math.round((completedImageCount / segments.length) * 40);
                    sendProgress(progress);
                }

                sendLog('✨ Wrapping up project...');

                await supabase
                    .from('projects')
                    .update({
                        status: 'video',
                        autopilot_status: 'completed',
                        autopilot_progress: 100,
                    })
                    .eq('id', project.id);

                sendProgress(100);
                sendEvent('completed', { projectId: project.id });
                controller.close();
            } catch (error: any) {
                console.error('[Autopilot] Error:', error);

                if (createdProjectId) {
                    const supabase = createServerClient();
                    await supabase
                        .from('projects')
                        .update({
                            autopilot_status: 'failed',
                        })
                        .eq('id', createdProjectId);
                }

                sendEvent('error', {
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: error?.message || 'Autopilot failed',
                    },
                });
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
