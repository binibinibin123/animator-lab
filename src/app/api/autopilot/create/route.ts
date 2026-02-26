// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';
import { generateScript } from '@/lib/ai/gemini';
import { generateImage } from '@/lib/ai/nanobanana';
import { parseCreateVisualMode, normalizeStyleInput } from '@/lib/api/visualModeValidation';
import { resolveReferenceContext } from '@/lib/image/referenceResolver';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const body = await request.json();
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const duration = Number(body.duration || 60);
    const rawStyle = body.style ?? 'anime';
    const rawStyleText = body.styleText;

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
                const { data: project, error: projectError } = await supabase
                    .from('projects')
                    .insert({
                        title: topic,
                        topic,
                        style: normalizedStyle.style,
                        style_text: normalizedStyle.styleText,
                        visual_mode: visualMode,
                        character_reference_url: body.characterReferenceUrl || null,
                        style_reference_url: body.styleReferenceUrl || null,
                        status: 'script',
                        autopilot_status: 'generating_script',
                        autopilot_progress: 5,
                    } as any)
                    .select()
                    .single();

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

                    try {
                        const imageResult = await generateImage({
                            prompt: segment.visual_description || segment.script_text,
                            style: resolved.effectiveStylePreset || 'anime',
                            styleText: resolved.effectiveStyleText,
                            aspectRatio: '16:9',
                            referenceImage: resolved.referenceImage || undefined,
                            referenceMimeType: resolved.referenceMimeType || 'image/png',
                            referenceIntent: resolved.referenceIntent,
                        });

                        await supabase
                            .from('segments')
                            .update({ image_url: imageResult.imageUrl } as never)
                            .eq('id', segment.id);
                    } catch (imageError: any) {
                        sendLog(`❌ Image generation failed for segment ${segment.order_index + 1}: ${imageError.message}`);
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
