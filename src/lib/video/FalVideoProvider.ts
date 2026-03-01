// FalVideoProvider - fal.ai Hailuo Minimax implementation
// Wraps existing fal.ai logic in VideoProvider interface

import { fal } from "@fal-ai/client";
import type { VideoProvider, VideoJobStatus } from './VideoProvider';
import {
    getDefaultVideoModelId,
    isVideoModelId,
    resolveVideoDuration,
    VIDEO_MODEL_REGISTRY,
    type VideoModelId,
} from '@/lib/models/registry';

// Configure fal client
fal.config({
    credentials: process.env.FAL_KEY,
});

export class FalVideoProvider implements VideoProvider {
    readonly name = 'fal' as const;

    private extractErrorStatus(error: unknown): number | null {
        if (!error || typeof error !== 'object') return null;
        const status = (error as { status?: unknown }).status;
        return typeof status === 'number' ? status : null;
    }

    private formatFalError(error: unknown): string {
        if (!error || typeof error !== 'object') {
            return 'Unknown error';
        }

        const message = (error as { message?: unknown }).message;
        const body = (error as { body?: unknown }).body;
        const detail = body && typeof body === 'object'
            ? (body as { detail?: unknown }).detail
            : undefined;

        const normalizedDetail = typeof detail === 'string'
            ? detail
            : detail
                ? JSON.stringify(detail)
                : '';

        const normalizedMessage = typeof message === 'string' && message.trim().length > 0
            ? message
            : 'Unknown error';

        return normalizedDetail
            ? `${normalizedMessage} (${normalizedDetail})`
            : normalizedMessage;
    }

    private async prepareImageUrlForFal(imageUrl: string): Promise<string> {
        if (!imageUrl) {
            throw new Error('imageUrl is required for image-to-video models');
        }

        const dataUrlMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (dataUrlMatch) {
            const mimeType = dataUrlMatch[1] || 'image/png';
            const base64Payload = dataUrlMatch[2];
            const buffer = Buffer.from(base64Payload, 'base64');
            const blob = new Blob([buffer], { type: mimeType });
            return fal.storage.upload(blob, { lifecycle: { expiresIn: '1d' } });
        }

        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            try {
                const response = await fetch(imageUrl);
                if (response.ok) {
                    const contentType = response.headers.get('content-type') || 'image/png';
                    const binary = await response.arrayBuffer();
                    const blob = new Blob([binary], { type: contentType });
                    return await fal.storage.upload(blob, { lifecycle: { expiresIn: '1d' } });
                }
                console.warn(`[FalVideoProvider] Image fetch failed (${response.status}). Falling back to direct URL.`);
            } catch (error) {
                console.warn('[FalVideoProvider] Failed to fetch image for storage upload. Falling back to direct URL.', error);
            }
        }

        return imageUrl;
    }

    async submitJob(request: { imageUrl: string; motionPrompt: string; duration?: number; modelId?: string; resolution?: string }): Promise<{ externalJobId: string }> {
        const { imageUrl, motionPrompt, duration = 6, modelId, resolution } = request;
        const resolvedModelId: VideoModelId = isVideoModelId(modelId) ? modelId : getDefaultVideoModelId();
        const modelConfig = VIDEO_MODEL_REGISTRY[resolvedModelId];
        const validDuration = resolveVideoDuration(resolvedModelId, duration);

        console.log(`[FalVideoProvider] Submitting job with model ${resolvedModelId} prompt: ${motionPrompt}`);

        const input: Record<string, unknown> = {
            prompt: motionPrompt,
            duration: validDuration,
        };

        if (resolution) {
            input.resolution = resolution;
        }

        if (modelConfig.acceptsImageInput) {
            input.image_url = await this.prepareImageUrlForFal(imageUrl);
        }

        let requestId = '';
        try {
            const { request_id } = await fal.queue.submit(modelConfig.endpoint, {
                input,
            });
            requestId = request_id;
        } catch (error) {
            throw new Error(this.formatFalError(error));
        }

        console.log(`[FalVideoProvider] Job submitted: ${requestId}`);

        return { externalJobId: requestId };
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
                let lastResultError: unknown = null;

                for (let attempt = 0; attempt < 3; attempt += 1) {
                    try {
                        const result = await fal.queue.result(modelConfig.endpoint, { requestId: externalJobId });
                        const data = result.data as { video?: { url?: string } };
                        const videoUrl = data?.video?.url || '';

                        console.log(`[FalVideoProvider] Completed! URL: ${videoUrl?.slice(0, 60)}...`);

                        return {
                            status: videoUrl ? 'succeeded' : 'failed',
                            progress: 1,
                            videoUrl,
                        };
                    } catch (resultError) {
                        lastResultError = resultError;
                        const statusCode = this.extractErrorStatus(resultError);
                        const isTransientResultWindow = statusCode === 422 || statusCode === 404;

                        if (isTransientResultWindow && attempt < 2) {
                            await new Promise((resolve) => setTimeout(resolve, 1200));
                            continue;
                        }

                        throw resultError;
                    }
                }

                throw lastResultError instanceof Error
                    ? lastResultError
                    : new Error('Failed to fetch completed video result');
            }

            // Estimate progress based on status
            const progress = status === 'queued' ? 0 : 0.5;

            return { status, progress };
        } catch (error) {
            const normalizedError = this.formatFalError(error);
            console.error('[FalVideoProvider] Error:', normalizedError);
            return {
                status: 'failed',
                progress: 0,
                error: normalizedError,
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
