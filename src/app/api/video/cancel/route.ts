// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getVideoProvider } from '@/lib/video';

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

            // 2. Call provider's cancel if available
            if (job.external_job_id) {
                try {
                    const provider = getVideoProvider(job.provider);
                    if (provider.cancelJob) {
                        await provider.cancelJob(job.external_job_id);
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
