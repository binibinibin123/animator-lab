// @ts-nocheck
// Video Generation API with Provider Abstraction
// Supports fal.ai provider

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerClient } from '@/lib/supabase';
import { generateVideoPrompt } from '@/lib/ai/videoPrompt';
import { getVideoProvider, VideoProviderType } from '@/lib/video';
import {
    ACTIVE_PRICING_VERSION,
    getDefaultVideoModelId,
    getSupportedVideoResolutions,
    isSupportedVideoResolution,
    isVideoModelId,
    quoteVideoCredits,
    resolveVideoDuration,
    resolveVideoResolution,
    VIDEO_MODEL_REGISTRY,
} from '@/lib/models/registry';
import {
    finalizeCredits,
    releaseReservedCredits,
    reserveCredits,
} from '@/lib/credits/ledger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// POST /api/video/generate - Submit video generation job
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            imageUrl,
            motion,
            duration,
            segmentId,
            projectId,
            scriptText,
            visualDescription,
            style,
            modelId,
            model,
            resolution,
            audioEnabled,
        } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { error: 'Image URL is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();
        const resolvedModelId = isVideoModelId(modelId) ? modelId : isVideoModelId(model) ? model : getDefaultVideoModelId();

        const modelConfig = VIDEO_MODEL_REGISTRY[resolvedModelId];
        if (!modelConfig?.enabled) {
            return NextResponse.json(
                { error: `Video model is disabled: ${resolvedModelId}` },
                { status: 400 }
            );
        }

        if (!isSupportedVideoResolution(resolvedModelId, resolution)) {
            return NextResponse.json(
                {
                    error: `Unsupported video resolution for model ${resolvedModelId}`,
                    requestedResolution: resolution,
                    supportedResolutions: getSupportedVideoResolutions(resolvedModelId),
                },
                { status: 400 }
            );
        }

        let providerType: VideoProviderType = 'fal';

        console.log(`[VideoAPI] Using provider: ${providerType}`);

        // Generate optimized video prompt from image analysis
        let videoPrompt = motion;
        let promptAnalysis = null;

        if (!motion || motion === 'auto') {
            console.log('Generating video prompt from image analysis...');
            try {
                const promptResult = await generateVideoPrompt({
                    imageUrl,
                    scriptText,
                    visualDescription,
                    style,
                });

                videoPrompt = promptResult.prompt;
                promptAnalysis = {
                    imageAnalysis: promptResult.imageAnalysis,
                    suggestedMotion: promptResult.suggestedMotion,
                };

                console.log('Generated video prompt:', videoPrompt);
            } catch (promptError) {
                console.error('Prompt generation failed, using fallback:', promptError);
                videoPrompt = 'Static scene. Fixed camera. Subtle ambient motion. Cinematic atmosphere.';
            }
        }

        let resolvedProjectId: string | null = projectId || null;
        if (!resolvedProjectId && segmentId) {
            const { data: segmentRow } = await supabase
                .from('segments')
                .select('project_id')
                .eq('id', segmentId)
                .single();
            resolvedProjectId = (segmentRow as { project_id?: string } | null)?.project_id || null;
        }

        const resolvedResolution = resolveVideoResolution(resolvedModelId, resolution);

        const quotedCredits = quoteVideoCredits(resolvedModelId, {
            durationSeconds: Number(duration || 6),
            resolution: resolvedResolution,
            audioEnabled: !!audioEnabled,
        });
        const effectiveDuration = resolveVideoDuration(resolvedModelId, Number(duration || 6));
        const operationId = request.headers.get('x-idempotency-key') || randomUUID();

        let reserveResult: {
            remainingCredits: number;
            insufficient?: boolean;
        } | null = null;

        if (resolvedProjectId) {
            reserveResult = await reserveCredits({
                supabase,
                projectId: resolvedProjectId,
                operationId,
                amount: quotedCredits,
                modelId: resolvedModelId,
                pricingVersion: ACTIVE_PRICING_VERSION,
                details: {
                    duration: effectiveDuration,
                    resolution: resolvedResolution,
                    audioEnabled: !!audioEnabled,
                },
            });

            if (reserveResult.insufficient) {
                return NextResponse.json(
                    {
                        error: 'Insufficient credits',
                        requiredCredits: quotedCredits,
                        remainingCredits: reserveResult.remainingCredits,
                    },
                    { status: 402 }
                );
            }
        }

        // Create job record in video_jobs table
        const { data: jobRecord, error: jobError } = await supabase
            .from('video_jobs')
            .insert({
                segment_id: segmentId || null,
                provider: providerType,
                model_id: resolvedModelId,
                status: 'queued',
                progress: 0,
                quote_credits: quotedCredits,
                pricing_version: ACTIVE_PRICING_VERSION,
                operation_id: operationId,
            })
            .select()
            .single();

        if (jobError) {
            console.error('Failed to create job record:', jobError);
            if (resolvedProjectId) {
                await releaseReservedCredits({
                    supabase,
                    operationId,
                    projectId: resolvedProjectId,
                    modelId: resolvedModelId,
                    pricingVersion: ACTIVE_PRICING_VERSION,
                    details: { reason: 'job_record_create_failed' },
                });
            }
            return NextResponse.json(
                { error: 'Failed to create job record' },
                { status: 500 }
            );
        }

        // Update segment with generated prompt if segmentId is present
        if (segmentId) {
            await supabase
                .from('segments')
                .update({
                    video_prompt: videoPrompt,
                    video_model: resolvedModelId,
                    last_quote_credits: quotedCredits,
                })
                .eq('id', segmentId);
        }

        // Get provider and submit job
        const provider = getVideoProvider(providerType);
        let externalJobId = '';
        try {
            const submitResult = await provider.submitJob({
                imageUrl,
                motionPrompt: videoPrompt,
                duration: effectiveDuration,
                segmentId: segmentId || '',
                style,
                modelId: resolvedModelId,
                resolution: resolvedResolution,
            });
            externalJobId = submitResult.externalJobId;
        } catch (submitError) {
            if (resolvedProjectId) {
                await releaseReservedCredits({
                    supabase,
                    operationId,
                    projectId: resolvedProjectId,
                    modelId: resolvedModelId,
                    pricingVersion: ACTIVE_PRICING_VERSION,
                    details: { reason: 'submit_failed' },
                });
            }
            throw submitError;
        }

        // Update job record with external ID
        if (jobRecord) {
            await supabase
                .from('video_jobs')
                .update({
                    external_job_id: externalJobId,
                    status: 'running',
                    started_at: new Date().toISOString(),
                })
                .eq('id', jobRecord.id);
        }

        return NextResponse.json({
            success: true,
            jobId: jobRecord?.id || externalJobId,
            externalJobId,
            provider: providerType,
            modelId: resolvedModelId,
            status: 'running',
            generatedPrompt: videoPrompt,
            promptAnalysis,
            quoteCredits: quotedCredits,
            pricingVersion: ACTIVE_PRICING_VERSION,
            remainingCredits: reserveResult?.remainingCredits,
            duration: effectiveDuration,
            resolution: resolvedResolution,
        });
    } catch (error) {
        console.error('Video generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate video' },
            { status: 500 }
        );
    }
}

// GET /api/video/generate?jobId=xxx OR ?segmentId=xxx OR ?requestId=xxx - Check video status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const segmentId = searchParams.get('segmentId');
        const requestId = searchParams.get('requestId');

        const supabase = createServerClient();
        let job: any = null;

        // Try to find job in video_jobs table first
        try {
            if (jobId) {
                const { data } = await supabase
                    .from('video_jobs')
                    .select('*')
                    .eq('id', jobId)
                    .single();
                job = data;
            } else if (segmentId && !requestId) {
                // Get most recent job for segment
                const { data } = await supabase
                    .from('video_jobs')
                    .select('*')
                    .eq('segment_id', segmentId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                job = data;
            } else if (requestId) {
                // Try lookup by external_job_id
                const { data } = await supabase
                    .from('video_jobs')
                    .select('*, segments(video_prompt)')
                    .eq('external_job_id', requestId)
                    .single();
                job = data;
            }
        } catch (dbError) {
            // video_jobs table might not exist, continue with direct provider check
            console.log('[VideoAPI] video_jobs lookup failed, falling back to direct provider check');
        }

        // If job found in DB, use it
        if (job) {
            // [Self-Healing] Ensure variables are up to date
            let currentStatus = job.status;
            let currentVideoUrl = job.output_url;

            // If job is not in final state, check with provider
            if (job.status !== 'succeeded' && job.status !== 'failed') {
                const provider = getVideoProvider(job.provider);
                const statusResult = await provider.checkStatus(job.external_job_id, job.model_id);

                console.log(`[VideoAPI] Provider status for ${jobId}:`, statusResult);

                // Update job record
                const updateData: any = {
                    status: statusResult.status,
                    progress: statusResult.progress,
                };

                if (statusResult.videoUrl) {
                    updateData.output_url = statusResult.videoUrl;
                    currentVideoUrl = statusResult.videoUrl; // Update local var for self-healing
                }
                if (statusResult.error) {
                    updateData.error = statusResult.error;
                }
                if (statusResult.status === 'succeeded' || statusResult.status === 'failed') {
                    updateData.finished_at = new Date().toISOString();
                }

                currentStatus = statusResult.status; // Update local var for self-healing

                await supabase
                    .from('video_jobs')
                    .update(updateData)
                    .eq('id', job.id);

                if (job.operation_id && job.segment_id) {
                    const { data: seg } = await supabase
                        .from('segments')
                        .select('project_id')
                        .eq('id', job.segment_id)
                        .single();
                    const projectIdForBilling = (seg as { project_id?: string } | null)?.project_id;

                    if (projectIdForBilling && statusResult.status === 'succeeded') {
                        await finalizeCredits({
                            supabase,
                            operationId: job.operation_id,
                            projectId: projectIdForBilling,
                            modelId: job.model_id || getDefaultVideoModelId(),
                            pricingVersion: job.pricing_version || ACTIVE_PRICING_VERSION,
                            details: { jobId: job.id },
                        });
                    }

                    if (projectIdForBilling && (statusResult.status === 'failed' || statusResult.status === 'cancelled')) {
                        await releaseReservedCredits({
                            supabase,
                            operationId: job.operation_id,
                            projectId: projectIdForBilling,
                            modelId: job.model_id || getDefaultVideoModelId(),
                            pricingVersion: job.pricing_version || ACTIVE_PRICING_VERSION,
                            details: { jobId: job.id, reason: statusResult.status },
                        });
                    }
                }

                job = { ...job, ...updateData };
            }

            // [Self-Healing] ALWAYS Sync video_url to segments table if job is succeeded
            // This fixes the "Zombie Job" issue where video_jobs has success but segments is empty
            if (currentStatus === 'succeeded' && currentVideoUrl && job.segment_id) {
                console.log(`[VideoAPI] 🔄 Enforcing segment persistence for job ${job.id}`);
                const { error: segError } = await supabase
                    .from('segments')
                    .update({ video_url: currentVideoUrl })
                    .eq('id', job.segment_id);

                if (segError) {
                    console.error('[VideoAPI] ❌ Failed to update segment video_url:', segError);
                } else {
                    console.log(`[VideoAPI] ✅ Segment ${job.segment_id} synced with video_url`);
                }
            }

            return NextResponse.json({
                success: true,
                jobId: job.id,
                externalJobId: job.external_job_id,
                provider: job.provider,
                modelId: job.model_id,
                status: job.status,
                progress: job.progress,
                videoUrl: job.output_url,
                generatedPrompt: job.segments?.video_prompt || job.video_prompt,
                error: job.error,
                quoteCredits: job.quote_credits,
                pricingVersion: job.pricing_version,
                debug: {
                    rawStatus: job.status,
                    hasVideoUrl: !!job.output_url,
                }
            });
        }

        // Fallback: Direct provider check without video_jobs table
        if (requestId) {
            console.log(`[VideoAPI] Direct provider check for requestId: ${requestId}`);
            const fallbackModel = searchParams.get('modelId');
            const provider = getVideoProvider('fal');
            const statusResult = await provider.checkStatus(
                requestId,
                isVideoModelId(fallbackModel) ? fallbackModel : getDefaultVideoModelId()
            );

            console.log(`[VideoAPI] Direct provider status:`, statusResult);

            // Update segment with video URL if completed and segmentId provided
            if ((statusResult.status === 'succeeded') && statusResult.videoUrl && segmentId) {
                await supabase
                    .from('segments')
                    .update({ video_url: statusResult.videoUrl })
                    .eq('id', segmentId);
            }

            return NextResponse.json({
                success: true,
                externalJobId: requestId,
                provider: 'fal',
                status: statusResult.status,
                progress: statusResult.progress,
                videoUrl: statusResult.videoUrl,
                error: statusResult.error,
                debug: {
                    rawStatus: statusResult.status,
                    hasVideoUrl: !!statusResult.videoUrl,
                    directCheck: true,
                }
            });
        }

        return NextResponse.json(
            { error: 'Job not found - provide requestId for direct provider check' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json(
            { error: 'Failed to check status' },
            { status: 500 }
        );
    }
}
