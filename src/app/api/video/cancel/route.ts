// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getVideoProvider } from '@/lib/video';
import { releaseReservedCredits } from '@/lib/credits/ledger';
import { ACTIVE_PRICING_VERSION, getDefaultVideoModelId } from '@/lib/models/registry';

// POST /api/video/cancel - Cancel video generation jobs
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobId, segmentId, projectId } = body;

        const supabase = createServerClient();
        let jobsToCancel: any[] = [];

        if (jobId) {
            const { data } = await supabase.from('video_jobs').select('*').eq('id', jobId).single();
            if (data) jobsToCancel.push(data);
        } else if (segmentId) {
            const { data } = await supabase.from('video_jobs').select('*').eq('segment_id', segmentId).neq('status', 'succeeded').neq('status', 'failed');
            if (data) jobsToCancel = data;
        } else if (projectId) {
            // Find all running jobs for segments in this project
            const { data: segments } = await supabase.from('segments').select('id').eq('project_id', projectId);
            if (segments && segments.length > 0) {
                const segmentIds = segments.map(s => s.id);
                const { data } = await supabase.from('video_jobs').select('*').in('segment_id', segmentIds).neq('status', 'succeeded').neq('status', 'failed');
                if (data) jobsToCancel = data;
            }
        }

        if (jobsToCancel.length === 0) {
            return NextResponse.json({ success: true, message: 'No active jobs found to cancel' });
        }

        console.log(`[CancelAPI] Cancelling ${jobsToCancel.length} jobs...`);

        for (const job of jobsToCancel) {
            // 1. Update DB status
            await supabase.from('video_jobs').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', job.id);

            if (job.operation_id && job.segment_id) {
                const { data: segmentData } = await supabase
                    .from('segments')
                    .select('project_id')
                    .eq('id', job.segment_id)
                    .single();
                const projectIdForBilling = (segmentData as { project_id?: string } | null)?.project_id;
                if (projectIdForBilling) {
                    await releaseReservedCredits({
                        supabase,
                        operationId: job.operation_id,
                        projectId: projectIdForBilling,
                        modelId: job.model_id || getDefaultVideoModelId(),
                        pricingVersion: job.pricing_version || ACTIVE_PRICING_VERSION,
                        details: { jobId: job.id, reason: 'cancelled' },
                    });
                }
            }

            // 2. Call provider's cancel if available
            if (job.external_job_id) {
                try {
                    const provider = getVideoProvider('fal');
                    if (provider.cancelJob) {
                        await provider.cancelJob(job.external_job_id, job.model_id || getDefaultVideoModelId());
                    }
                } catch (providerError) {
                    console.error(`[CancelAPI] Provider cancel failed for job ${job.id}:`, providerError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            cancelledCount: jobsToCancel.length,
        });
    } catch (error: any) {
        console.error('[CancelAPI] Error:', error);
        return NextResponse.json({ error: 'Failed to cancel jobs', details: error.message }, { status: 500 });
    }
}
