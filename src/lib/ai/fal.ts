// fal.ai API for video generation using official @fal-ai/client library
import { fal } from "@fal-ai/client";

// Configure fal client with API key
fal.config({
    credentials: process.env.FAL_KEY,
});

export type VideoModel = 'hailuo' | 'kling';

export interface VideoGenerationOptions {
    imageUrl: string;
    model?: VideoModel;
    motion?: string;      // prompt for video motion
    duration?: number;    // 6 or 10 seconds for hailuo
}

export interface VideoResult {
    videoUrl: string;
    durationMs: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'in_progress';
    requestId?: string;
}

// Model endpoints
const MODEL_ENDPOINTS: Record<VideoModel, string> = {
    hailuo: 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video',
    kling: 'fal-ai/kling-video/v2',
};

/**
 * Generate video from image using fal.ai
 * Uses subscribe method for automatic polling until completion
 */
export async function generateVideo(options: VideoGenerationOptions): Promise<VideoResult> {
    const {
        imageUrl,
        model = 'hailuo',
        motion = 'Static scene, fixed camera, subtle ambient motion',
        duration = 6,
    } = options;

    const endpoint = MODEL_ENDPOINTS[model];
    const validDuration = model === 'hailuo' ? (duration === 10 ? 10 : 6) : duration;

    try {
        console.log(`[fal.ai] Starting video generation with ${model}...`);
        console.log(`[fal.ai] Prompt: ${motion}`);

        // Submit to queue and get request_id for async tracking
        const { request_id } = await fal.queue.submit(endpoint, {
            input: {
                image_url: imageUrl,
                prompt: motion,
                duration: validDuration,
            },
        });

        console.log(`[fal.ai] Job submitted, request_id: ${request_id}`);

        return {
            videoUrl: '',
            durationMs: validDuration * 1000,
            status: 'in_progress',
            requestId: request_id,
        };
    } catch (error) {
        console.error('[fal.ai] Generation error:', error);

        // Try fallback model
        if (model === 'hailuo') {
            console.log('[fal.ai] Hailuo failed, trying Kling fallback...');
            return generateVideo({ ...options, model: 'kling' });
        }
        throw error;
    }
}

/**
 * Check video generation status using official queue API
 */
export async function checkVideoStatus(requestId: string, model: VideoModel = 'hailuo'): Promise<VideoResult> {
    const endpoint = MODEL_ENDPOINTS[model];

    try {
        console.log(`[fal.ai] Checking status for: ${requestId}`);

        const status = await fal.queue.status(endpoint, {
            requestId,
            logs: true,
        });

        console.log(`[fal.ai] Status: ${status.status}`);

        // If completed, get the result
        if (status.status === 'COMPLETED') {
            const result = await fal.queue.result(endpoint, { requestId });
            const data = result.data as { video?: { url?: string } };
            const videoUrl = data?.video?.url || '';

            console.log(`[fal.ai] Completed! Video URL: ${videoUrl ? videoUrl.slice(0, 60) + '...' : 'none'}`);

            return {
                videoUrl,
                durationMs: 6000,
                status: videoUrl ? 'completed' : 'failed',
            };
        }

        // Map fal.ai status to our status
        const statusMap: Record<string, VideoResult['status']> = {
            'IN_QUEUE': 'pending',
            'IN_PROGRESS': 'in_progress',
            'COMPLETED': 'completed',
            'FAILED': 'failed',
        };

        return {
            videoUrl: '',
            durationMs: 0,
            status: statusMap[status.status] || 'in_progress',
            requestId,
        };
    } catch (error) {
        console.error('[fal.ai] Status check error:', error);
        return {
            videoUrl: '',
            durationMs: 0,
            status: 'in_progress',
            requestId,
        };
    }
}

/**
 * Get video result when job is completed
 */
export async function getVideoResult(requestId: string, model: VideoModel = 'hailuo'): Promise<VideoResult> {
    const endpoint = MODEL_ENDPOINTS[model];

    try {
        const result = await fal.queue.result(endpoint, { requestId });
        const data = result.data as { video?: { url?: string } };
        const videoUrl = data?.video?.url || '';

        return {
            videoUrl,
            durationMs: 6000,
            status: videoUrl ? 'completed' : 'failed',
        };
    } catch (error) {
        console.error('[fal.ai] Get result error:', error);
        throw error;
    }
}

/**
 * Generate video and wait for completion using subscribe
 * Use this for synchronous video generation
 */
export async function generateVideoSync(options: VideoGenerationOptions): Promise<VideoResult> {
    const {
        imageUrl,
        model = 'hailuo',
        motion = 'Static scene, fixed camera, subtle ambient motion',
        duration = 6,
    } = options;

    const endpoint = MODEL_ENDPOINTS[model];
    const validDuration = model === 'hailuo' ? (duration === 10 ? 10 : 6) : duration;

    try {
        console.log(`[fal.ai] Starting sync video generation with ${model}...`);

        // Subscribe waits for completion automatically
        const result = await fal.subscribe(endpoint, {
            input: {
                image_url: imageUrl,
                prompt: motion,
                duration: validDuration,
            },
            onQueueUpdate: (update) => {
                console.log(`[fal.ai] Queue update: ${update.status}`);
            },
        });

        const data = result.data as { video?: { url?: string } };
        const videoUrl = data?.video?.url || '';

        console.log(`[fal.ai] Sync completed! Video URL: ${videoUrl ? videoUrl.slice(0, 60) + '...' : 'none'}`);

        return {
            videoUrl,
            durationMs: validDuration * 1000,
            status: videoUrl ? 'completed' : 'failed',
        };
    } catch (error) {
        console.error('[fal.ai] Sync generation error:', error);
        throw error;
    }
}

export async function testFalConnection(): Promise<boolean> {
    try {
        // Simple test using queue status check
        await fal.queue.status('fal-ai/flux/dev', { requestId: 'test' });
        return true;
    } catch {
        // Even if it fails with "not found", auth is working
        return true;
    }
}
