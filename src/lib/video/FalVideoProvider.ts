// FalVideoProvider - fal.ai Hailuo Minimax implementation
// Wraps existing fal.ai logic in VideoProvider interface

import { fal } from "@fal-ai/client";
import type { VideoProvider, VideoJobStatus } from './VideoProvider';
import {
    getDefaultVideoModelId,
    isVideoModelId,
    VIDEO_MODEL_REGISTRY,
    type VideoModelId,
} from '@/lib/models/registry';

// Configure fal client
fal.config({
    credentials: process.env.FAL_KEY,
});

export class FalVideoProvider implements VideoProvider {
    readonly name = 'fal' as const;

    async submitJob(request: { imageUrl: string; motionPrompt: string; duration?: number; modelId?: string }): Promise<{ externalJobId: string }> {
        const { imageUrl, motionPrompt, duration = 6, modelId } = request;
        const resolvedModelId: VideoModelId = isVideoModelId(modelId) ? modelId : getDefaultVideoModelId();
        const modelConfig = VIDEO_MODEL_REGISTRY[resolvedModelId];
        const validDuration = duration === 10 ? '10' : '6';

        console.log(`[FalVideoProvider] Submitting job with model ${resolvedModelId} prompt: ${motionPrompt}`);

        const input: Record<string, unknown> = {
            prompt: motionPrompt,
            duration: validDuration,
        };

        if (modelConfig.acceptsImageInput) {
            input.image_url = imageUrl;
        }

        const { request_id } = await fal.queue.submit(modelConfig.endpoint, {
            input,
        });

        console.log(`[FalVideoProvider] Job submitted: ${request_id}`);

        return { externalJobId: request_id };
    }

    async checkStatus(externalJobId: string, modelId?: string): Promise<{
        status: VideoJobStatus;
        progress: number;
        videoUrl?: string;
        error?: string;
    }> {
        try {
            const resolvedModelId: VideoModelId = isVideoModelId(modelId) ? modelId : getDefaultVideoModelId();
            const modelConfig = VIDEO_MODEL_REGISTRY[resolvedModelId];
            console.log(`[FalVideoProvider] Checking status: ${externalJobId}`);

            const queueStatus = await fal.queue.status(modelConfig.endpoint, {
                requestId: externalJobId,
                logs: true,
            });

            console.log(`[FalVideoProvider] Raw status: ${queueStatus.status}`);

            // Map fal.ai status to our unified status
            const statusMap: Record<string, VideoJobStatus> = {
                'IN_QUEUE': 'queued',
                'IN_PROGRESS': 'running',
                'COMPLETED': 'succeeded',
                'FAILED': 'failed',
            };

            const status = statusMap[queueStatus.status] || 'running';

            // If completed, get the result
            if (queueStatus.status === 'COMPLETED') {
                const result = await fal.queue.result(modelConfig.endpoint, { requestId: externalJobId });
                const data = result.data as { video?: { url?: string } };
                const videoUrl = data?.video?.url || '';

                console.log(`[FalVideoProvider] Completed! URL: ${videoUrl?.slice(0, 60)}...`);

                return {
                    status: videoUrl ? 'succeeded' : 'failed',
                    progress: 1,
                    videoUrl,
                };
            }

            // Estimate progress based on status
            const progress = status === 'queued' ? 0 : 0.5;

            return { status, progress };
        } catch (error: any) {
            console.error('[FalVideoProvider] Error:', error);
            return {
                status: 'failed',
                progress: 0,
                error: error.message || 'Unknown error',
            };
        }
    }

    async cancelJob(externalJobId: string, modelId?: string): Promise<boolean> {
        try {
            const resolvedModelId: VideoModelId = isVideoModelId(modelId) ? modelId : getDefaultVideoModelId();
            const modelConfig = VIDEO_MODEL_REGISTRY[resolvedModelId];
            await fal.queue.cancel(modelConfig.endpoint, { requestId: externalJobId });
            return true;
        } catch (error) {
            console.error('[FalVideoProvider] Cancel error:', error);
            return false;
        }
    }
}
