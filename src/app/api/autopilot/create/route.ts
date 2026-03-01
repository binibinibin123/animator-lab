// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { createServerClient } from '@/lib/supabase';
import { generateScript } from '@/lib/ai/gemini';
import { generateImage } from '@/lib/ai/nanobanana';
import { generateQuickVideoPrompt } from '@/lib/ai/videoPrompt';
import { DEFAULT_VOICES, generateTTS } from '@/lib/ai/elevenlabs';
import { parseCreateVisualMode, normalizeStyleInput } from '@/lib/api/visualModeValidation';
import { resolveReferenceContext } from '@/lib/image/referenceResolver';
import { getVideoProvider } from '@/lib/video';
import {
    getDefaultImageModelId,
    getDefaultVideoModelId,
    getSupportedImageQualities,
    getSupportedVideoResolutions,
    isSupportedImageQuality,
    isSupportedVideoResolution,
    isImageModelId,
    resolveRenderStrategy,
    isVideoModelId,
    resolveImageQuality,
    resolveVideoResolution,
} from '@/lib/models/registry';
import { finalizeCredits, releaseReservedCredits, reserveCredits } from '@/lib/credits/ledger';
import { loadPricingContext, quoteImageCreditsWithContext, quoteVideoCreditsWithContext } from '@/lib/credits/pricing';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ASPECT_RATIOS = ['16:9', '1:1', '3:4', '9:16'] as const;
const AUTOPILOT_SCRIPT_PERSONAS = [
    'ko_trust_briefing',
    'ko_empathy_story',
    'ko_practical_coach',
    'ko_trend_analyst',
    'ko_light_variety',
] as const;
const DEFAULT_AUTOPILOT_PERSONA = AUTOPILOT_SCRIPT_PERSONAS[0];
const DEFAULT_AUTOPILOT_DURATION = 30;
const MIN_AUTOPILOT_DURATION = 15;
const MAX_AUTOPILOT_DURATION = 180;
const MEDIA_BUCKET = 'autovideo-media';

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

function parseDuration(value: unknown, fallback = DEFAULT_AUTOPILOT_DURATION) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    const rounded = Math.round(numeric);
    if (rounded < MIN_AUTOPILOT_DURATION || rounded > MAX_AUTOPILOT_DURATION) {
        return fallback;
    }

    return rounded;
}

function parseAutopilotPersona(value: unknown) {
    if (typeof value !== 'string') {
        return DEFAULT_AUTOPILOT_PERSONA;
    }

    const trimmed = value.trim();
    if ((AUTOPILOT_SCRIPT_PERSONAS as readonly string[]).includes(trimmed)) {
        return trimmed;
    }

    return DEFAULT_AUTOPILOT_PERSONA;
}

function isSchemaMissingColumnError(error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    return message.includes('schema cache') && message.includes('Could not find the');
}

function parseImageDataUrl(dataUrl: string) {
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return null;
    }

    const mimeType = matches[1];
    const base64Payload = matches[2];
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';

    return {
        mimeType,
        base64Payload,
        extension,
    };
}

async function uploadImageDataUrlToStorage(options: {
    supabase: ReturnType<typeof createServerClient>;
    dataUrl: string;
    projectId: string;
    segmentId: string;
}) {
    const parsed = parseImageDataUrl(options.dataUrl);
    if (!parsed) {
        throw new Error('Unsupported image payload format for storage upload');
    }

    const imageBuffer = Buffer.from(parsed.base64Payload, 'base64');
    const filePath = `images/autopilot_${options.projectId}_${options.segmentId}_${Date.now()}.${parsed.extension}`;

    const { error: uploadError } = await options.supabase
        .storage
        .from(MEDIA_BUCKET)
        .upload(filePath, imageBuffer, {
            contentType: parsed.mimeType,
            upsert: true,
        });

    if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload generated image');
    }

    const { data: publicUrlData } = options.supabase
        .storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
        throw new Error('Failed to resolve public URL for generated image');
    }

    return publicUrl;
}

async function uploadAudioBufferToStorage(options: {
    supabase: ReturnType<typeof createServerClient>;
    projectId: string;
    segmentId: string;
    audioBuffer: Uint8Array;
}) {
    const filePath = `audio/autopilot_${options.projectId}_${options.segmentId}_${Date.now()}.mp3`;

    const { error: uploadError } = await options.supabase
        .storage
        .from(MEDIA_BUCKET)
        .upload(filePath, options.audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
        });

    if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload generated audio');
    }

    const { data: publicUrlData } = options.supabase
        .storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
        throw new Error('Failed to resolve public URL for generated audio');
    }

    return publicUrl;
}

export async function POST(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const body = await request.json();
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const duration = parseDuration(body.duration);
    const rawStyle = body.style ?? 'anime';
    const rawStyleText = body.styleText;
    const scriptPersona = parseAutopilotPersona(body.persona);
    const requestedVoiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : '';
    const imageModelId = isImageModelId(body.imageModelId) ? body.imageModelId : getDefaultImageModelId();
    const videoModelId = isVideoModelId(body.videoModelId) ? body.videoModelId : getDefaultVideoModelId();
    const imageQualityInput = body.imageQuality || body.imageResolution;
    const videoResolutionInput = body.videoResolution || body.resolution;
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

    if (!isSupportedVideoResolution(videoModelId, videoResolutionInput)) {
        return errorResponse(400, 'INVALID_INPUT', 'Unsupported video resolution', {
            modelId: videoModelId,
            requestedResolution: videoResolutionInput,
            supportedResolutions: getSupportedVideoResolutions(videoModelId),
        });
    }
    const videoResolution = resolveVideoResolution(videoModelId, videoResolutionInput);

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
                sendLog(`🚀 Starting Autopilot for topic: ${topic} (${duration}초)`);
                sendProgress(5);

                const supabase = createServerClient();
                const pricingContext = await loadPricingContext(supabase);
                const pricingVersion = pricingContext.pricingVersion;
                const modernProjectInsert = {
                    title: topic,
                    topic,
                    duration,
                    style: normalizedStyle.style,
                    style_text: normalizedStyle.styleText,
                    image_model: imageModelId,
                    video_model: videoModelId,
                    pricing_version: pricingVersion,
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
                        duration,
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

                const scriptResult = await generateScript(topic, duration, scriptStyle, 'ko', scriptPersona);
                sendProgress(20);
                sendLog(`✅ Script generated: "${scriptResult.title}" (${scriptResult.segments.length} segments, tone=${scriptPersona})`);

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
                sendLog('🎙️ Generating TTS audio...');

                const defaultVoiceId = requestedVoiceId || DEFAULT_VOICES[0]?.voiceId;
                let completedVoiceCount = 0;

                for (const segment of segments) {
                    try {
                        if (!defaultVoiceId) {
                            throw new Error('No default voice configured');
                        }

                        const ttsResult = await generateTTS(segment.script_text || '', defaultVoiceId);
                        const audioUrl = await uploadAudioBufferToStorage({
                            supabase,
                            projectId: project.id,
                            segmentId: segment.id,
                            audioBuffer: ttsResult.audioBuffer,
                        });

                        const { error: voiceUpdateError } = await supabase
                            .from('segments')
                            .update({
                                audio_url: audioUrl,
                                duration_ms: ttsResult.durationMs,
                            } as never)
                            .eq('id', segment.id);

                        if (voiceUpdateError) {
                            throw new Error(voiceUpdateError.message || 'Failed to persist TTS result');
                        }

                        segment.audio_url = audioUrl;
                        segment.duration_ms = ttsResult.durationMs;
                        sendLog(`✅ TTS generated for segment ${segment.order_index + 1}`);
                    } catch (ttsError: any) {
                        sendLog(`⚠️ TTS skipped for segment ${segment.order_index + 1}. Using estimated duration. (${ttsError.message || 'unknown'})`);
                    }

                    completedVoiceCount += 1;
                    const progress = 25 + Math.round((completedVoiceCount / segments.length) * 20);
                    sendProgress(progress);
                    await delay(120);
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
                    const quotedCredits = quoteImageCreditsWithContext(pricingContext, imageModelId, imageQuality).quoteCredits;

                    try {
                        const reserveResult = await reserveCredits({
                            supabase,
                            projectId: project.id,
                            operationId,
                            amount: quotedCredits,
                            modelId: imageModelId,
                            pricingVersion,
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

                        const persistedImageUrl = imageResult.imageUrl.startsWith('data:image')
                            ? await uploadImageDataUrlToStorage({
                                supabase,
                                dataUrl: imageResult.imageUrl,
                                projectId: project.id,
                                segmentId: segment.id,
                            })
                            : imageResult.imageUrl;

                        const segmentUpdate = await supabase
                            .from('segments')
                            .update({
                                image_url: persistedImageUrl,
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
                                        image_url: persistedImageUrl,
                                    } as never)
                                    .eq('id', segment.id);

                                if (fallbackSegmentUpdate.error) {
                                    throw new Error(fallbackSegmentUpdate.error.message || 'Failed to update segment image_url');
                                }
                            } else {
                                throw new Error(segmentUpdate.error.message || 'Failed to update segment image data');
                            }
                        }

                        segment.image_url = imageResult.imageUrl;

                        await finalizeCredits({
                            supabase,
                            operationId,
                            projectId: project.id,
                            modelId: imageModelId,
                            pricingVersion,
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
                            pricingVersion,
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

                await supabase
                    .from('projects')
                    .update({
                        status: 'video',
                        autopilot_status: 'generating_videos',
                        autopilot_progress: 90,
                    })
                    .eq('id', project.id);

                sendProgress(90);
                sendLog('🎬 Generating videos...');

                const provider = getVideoProvider('fal');
                const segmentsForVideo = segments as Array<{
                    id: string;
                    order_index: number;
                    script_text: string;
                    visual_description?: string | null;
                    duration_ms?: number | null;
                    image_url?: string | null;
                }>;

                let completedVideoCount = 0;
                let succeededVideoCount = 0;

                for (const segment of segmentsForVideo) {
                    sendLog(`🎞️ Generating video ${segment.order_index + 1}/${segmentsForVideo.length}`);

                    if (!segment.image_url) {
                        sendLog(`⚠️ Skipping video ${segment.order_index + 1}: image is missing.`);
                        completedVideoCount += 1;
                        const progress = 90 + Math.round((completedVideoCount / segmentsForVideo.length) * 9);
                        sendProgress(progress);
                        continue;
                    }

                    const requestedVideoDurationSeconds = Math.max(1, Math.round(Number(segment.duration_ms || 6000) / 1000));
                    const videoQuote = quoteVideoCreditsWithContext(pricingContext, videoModelId, {
                        durationSeconds: requestedVideoDurationSeconds,
                        resolution: videoResolution,
                        audioEnabled: false,
                    });
                    const resolvedVideoDurationSeconds = videoQuote.resolvedDurationSeconds;
                    const quotedVideoCredits = videoQuote.quoteCredits;
                    const operationId = `autopilot:video:${project.id}:${segment.id}`;
                    const motionPrompt = generateQuickVideoPrompt(segment.script_text, segment.visual_description || undefined);

                    try {
                        const reserveResult = await reserveCredits({
                            supabase,
                            projectId: project.id,
                            operationId,
                            amount: quotedVideoCredits,
                            modelId: videoModelId,
                            pricingVersion,
                            details: {
                                segmentId: segment.id,
                                source: 'autopilot',
                                duration: resolvedVideoDurationSeconds,
                                resolution: videoResolution,
                            },
                        });

                        if (reserveResult.insufficient) {
                            sendLog(`❌ Not enough credits for video ${segment.order_index + 1}. Required: ${quotedVideoCredits}`);
                            completedVideoCount += 1;
                            const progress = 90 + Math.round((completedVideoCount / segmentsForVideo.length) * 9);
                            sendProgress(progress);
                            continue;
                        }

                        let videoJobId: string | null = null;
                        const { data: jobRecord, error: jobError } = await supabase
                            .from('video_jobs')
                            .insert({
                                segment_id: segment.id,
                                provider: 'fal',
                                model_id: videoModelId,
                                status: 'queued',
                                progress: 0,
                                quote_credits: quotedVideoCredits,
                                pricing_version: pricingVersion,
                                operation_id: operationId,
                            } as never)
                            .select('id')
                            .single();

                        if (!jobError && jobRecord?.id) {
                            videoJobId = jobRecord.id;
                        } else if (jobError && !isSchemaMissingColumnError(jobError)) {
                            throw new Error(jobError.message || 'Failed to create video job record');
                        }

                        await supabase
                            .from('segments')
                            .update({
                                video_prompt: motionPrompt,
                                video_model: videoModelId,
                                last_quote_credits: quotedVideoCredits,
                            } as never)
                            .eq('id', segment.id);

                        const submitResult = await provider.submitJob({
                            imageUrl: segment.image_url,
                            motionPrompt,
                            duration: resolvedVideoDurationSeconds,
                            segmentId: segment.id,
                            style: resolved.effectiveStylePreset,
                            modelId: videoModelId,
                            resolution: videoResolution,
                        });

                        if (videoJobId) {
                            await supabase
                                .from('video_jobs')
                                .update({
                                    external_job_id: submitResult.externalJobId,
                                    status: 'running',
                                    started_at: new Date().toISOString(),
                                } as never)
                                .eq('id', videoJobId);
                        }

                        let lastStatus = 'queued';
                        let videoUrl: string | undefined;
                        let videoError: string | undefined;
                        const maxAttempts = 180;

                        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                            const statusResult = await provider.checkStatus(submitResult.externalJobId, videoModelId);
                            lastStatus = statusResult.status;
                            videoUrl = statusResult.videoUrl;
                            videoError = statusResult.error;

                            if (videoJobId) {
                                await supabase
                                    .from('video_jobs')
                                    .update({
                                        status: statusResult.status,
                                        progress: statusResult.progress,
                                        output_url: statusResult.videoUrl || null,
                                        error: statusResult.error || null,
                                        ...(statusResult.status === 'succeeded' || statusResult.status === 'failed' || statusResult.status === 'cancelled'
                                            ? { finished_at: new Date().toISOString() }
                                            : {}),
                                    } as never)
                                    .eq('id', videoJobId);
                            }

                            if (statusResult.status === 'succeeded' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
                                break;
                            }

                            await delay(2500);
                        }

                        if (lastStatus === 'succeeded' && videoUrl) {
                            const { error: updateVideoError } = await supabase
                                .from('segments')
                                .update({
                                    video_url: videoUrl,
                                    video_model: videoModelId,
                                    last_quote_credits: quotedVideoCredits,
                                } as never)
                                .eq('id', segment.id);

                            if (updateVideoError) {
                                throw new Error(updateVideoError.message || 'Failed to persist generated video URL');
                            }

                            await finalizeCredits({
                                supabase,
                                operationId,
                                projectId: project.id,
                                modelId: videoModelId,
                                pricingVersion,
                                details: {
                                    segmentId: segment.id,
                                    source: 'autopilot',
                                },
                            });

                            succeededVideoCount += 1;
                            sendLog(`✅ Video generated for segment ${segment.order_index + 1}`);
                        } else {
                            await releaseReservedCredits({
                                supabase,
                                operationId,
                                projectId: project.id,
                                modelId: videoModelId,
                                pricingVersion,
                                details: {
                                    segmentId: segment.id,
                                    source: 'autopilot',
                                    reason: lastStatus === 'queued' || lastStatus === 'running' ? 'autopilot_video_timeout' : 'autopilot_video_failed',
                                },
                            });

                            sendLog(`❌ Video generation failed for segment ${segment.order_index + 1}${videoError ? `: ${videoError}` : ''}`);
                        }
                    } catch (videoError: any) {
                        sendLog(`❌ Video generation failed for segment ${segment.order_index + 1}: ${videoError.message}`);
                        await releaseReservedCredits({
                            supabase,
                            operationId,
                            projectId: project.id,
                            modelId: videoModelId,
                            pricingVersion,
                            details: {
                                segmentId: segment.id,
                                source: 'autopilot',
                                reason: 'autopilot_video_exception',
                            },
                        });
                    }

                    completedVideoCount += 1;
                    const progress = 90 + Math.round((completedVideoCount / segmentsForVideo.length) * 9);
                    sendProgress(progress);
                }

                sendLog(`🎬 Video generation finished (${succeededVideoCount}/${segmentsForVideo.length} 성공)`);

                sendLog('✨ Wrapping up project...');

                await supabase
                    .from('projects')
                    .update({
                        status: 'preview',
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
