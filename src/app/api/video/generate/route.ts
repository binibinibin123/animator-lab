// @ts-nocheck
// Video Generation API with Provider Abstraction
// Supports fal.ai and local ComfyUI providers

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVideoPrompt } from '@/lib/ai/videoPrompt';
import { getVideoProvider, VideoProviderType } from '@/lib/video';

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
            scriptText,
            visualDescription,
            style,
            provider: requestedProvider,
            workflowId
        } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { error: 'Image URL is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Determine which provider to use
        let providerType: VideoProviderType = 'fal';

        if (requestedProvider) {
            providerType = requestedProvider as VideoProviderType;
        } else if (segmentId) {
            // Check segment override first, then project default
            const { data: segment } = await supabase
                .from('segments')
                .select('video_provider_override, project_id')
                .eq('id', segmentId)
                .single();

            if (segment?.video_provider_override) {
                providerType = segment.video_provider_override as VideoProviderType;
            } else if (segment?.project_id) {
                const { data: project } = await supabase
                    .from('projects')
                    .select('video_provider')
                    .eq('id', segment.project_id)
                    .single();

                if (project?.video_provider) {
                    providerType = project.video_provider as VideoProviderType;
                }
            }
        }

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

        // Create job record in video_jobs table
        const { data: jobRecord, error: jobError } = await supabase
            .from('video_jobs')
            .insert({
                segment_id: segmentId || null,
                provider: providerType,
                status: 'queued',
                progress: 0,
            })
            .select()
            .single();

        if (jobError) {
            console.error('Failed to create job record:', jobError);
            // Continue without job tracking for backward compatibility
        }

        // Update segment with generated prompt if segmentId is present
        if (segmentId) {
            await supabase
                .from('segments')
                .update({ video_prompt: videoPrompt })
                .eq('id', segmentId);
        }

        // Get provider and submit job
        const provider = getVideoProvider(providerType);
        const { externalJobId } = await provider.submitJob({
            imageUrl,
            motionPrompt: videoPrompt,
            duration: duration || 6,
            segmentId: segmentId || '',
            style,
            workflowId: providerType === 'comfyui' ? workflowId : undefined // Only pass workflowId for comfyui
        });

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
            status: 'running',
            generatedPrompt: videoPrompt,
            promptAnalysis,
        });
    } catch (error) {
        console.error('Video generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate video' },
            { status: 500 }
        );
    }
}

// GET /api/video/generate?jobId=xxx OR ?segmentId=xxx OR ?requestId=xxx&provider=xxx - Check video status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const segmentId = searchParams.get('segmentId');
        const requestId = searchParams.get('requestId'); // External job ID (ComfyUI prompt_id or fal request_id)
        const providerParam = searchParams.get('provider') || 'comfyui'; // Default to comfyui for legacy

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
                const statusResult = await provider.checkStatus(job.external_job_id);

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
                status: job.status,
                progress: job.progress,
                videoUrl: job.output_url,
                generatedPrompt: job.segments?.video_prompt || job.video_prompt,
                error: job.error,
                debug: {
                    rawStatus: job.status,
                    hasVideoUrl: !!job.output_url,
                }
            });
        }

        // Fallback: Direct provider check without video_jobs table
        if (requestId) {
            console.log(`[VideoAPI] Direct provider check for requestId: ${requestId}`);
            const provider = getVideoProvider(providerParam as VideoProviderType);
            const statusResult = await provider.checkStatus(requestId);

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
                provider: providerParam,
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
