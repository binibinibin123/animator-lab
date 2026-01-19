// fal.ai API for video generation (Hailuo 2.3 Fast, Kling 2.6)

const FAL_API_KEY = process.env.FAL_KEY!;
const FAL_API_URL = 'https://queue.fal.run';

export type VideoModel = 'hailuo' | 'kling';

export interface VideoGenerationOptions {
    imageUrl: string;
    model?: VideoModel;
    motion?: string;      // prompt for video motion
    duration?: number;    // 6 or 10 seconds for hailuo
    fps?: number;
}

export interface VideoResult {
    videoUrl: string;
    durationMs: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'in_progress';
    requestId?: string;
}

// Model endpoints - Updated to correct Hailuo 2.3 Fast endpoint
const MODEL_ENDPOINTS: Record<VideoModel, string> = {
    hailuo: 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video',  // Hailuo 2.3 Fast
    kling: 'fal-ai/kling-video/v2',  // Kling 2.6
};

export async function generateVideo(options: VideoGenerationOptions): Promise<VideoResult> {
    const {
        imageUrl,
        model = 'hailuo',
        motion = 'Static scene, fixed camera, subtle ambient motion',
        duration = 6,  // Hailuo supports 6 or 10 seconds
    } = options;

    const endpoint = MODEL_ENDPOINTS[model];

    // Validate duration for Hailuo (must be 6 or 10)
    const validDuration = model === 'hailuo'
        ? (duration === 10 ? 10 : 6)
        : duration;

    try {
        // Submit job to queue
        const submitResponse = await fetch(`${FAL_API_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_API_KEY}`,
            },
            body: JSON.stringify({
                image_url: imageUrl,
                prompt: motion,
                duration: validDuration,
            }),
        });

        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            console.error('fal.ai API error:', errorText);

            // Try fallback model
            if (model === 'hailuo') {
                console.log('Hailuo failed, trying Kling fallback...');
                return generateVideo({ ...options, model: 'kling' });
            }
            throw new Error(`fal.ai API error: ${submitResponse.status}`);
        }

        const data = await submitResponse.json();
        console.log('fal.ai response:', JSON.stringify(data, null, 2));

        // Check if we got a request_id (async mode) or direct result
        if (data.request_id) {
            // Async mode - return request ID for polling
            return {
                videoUrl: '',
                durationMs: validDuration * 1000,
                status: 'in_progress',
                requestId: data.request_id,
            };
        }

        // Direct result (subscribe mode)
        return {
            videoUrl: data.video?.url || '',
            durationMs: validDuration * 1000,
            status: data.video?.url ? 'completed' : 'failed',
        };
    } catch (error) {
        console.error('fal.ai API error:', error);
        throw error;
    }
}

// Poll for job status - Try to get result directly (more reliable)
export async function checkVideoStatus(requestId: string, model: VideoModel = 'hailuo'): Promise<VideoResult> {
    const endpoint = MODEL_ENDPOINTS[model];
    const resultUrl = `${FAL_API_URL}/${endpoint}/requests/${requestId}`;

    console.log(`[fal.ai] Trying to get result from: ${resultUrl}`);

    try {
        const response = await fetch(resultUrl, {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
            },
        });

        console.log(`[fal.ai] Result response code: ${response.status}`);

        // 202 = still processing
        if (response.status === 202) {
            console.log(`[fal.ai] Still processing (202)`);
            return {
                videoUrl: '',
                durationMs: 0,
                status: 'in_progress',
                requestId,
            };
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[fal.ai] Result fetch failed: ${response.status}`, errorText);
            return {
                videoUrl: '',
                durationMs: 0,
                status: 'in_progress',
                requestId,
            };
        }

        const data = await response.json();
        console.log('[fal.ai] Result response:', JSON.stringify(data, null, 2));

        // Hailuo returns video.url
        const videoUrl = data.video?.url || data.data?.video?.url || '';

        console.log(`[fal.ai] Video URL: ${videoUrl ? videoUrl.slice(0, 60) + '...' : 'none'}`);

        if (videoUrl) {
            return {
                videoUrl,
                durationMs: 6000,
                status: 'completed',
            };
        }

        return {
            videoUrl: '',
            durationMs: 0,
            status: 'in_progress',
            requestId,
        };
    } catch (error) {
        console.error('[fal.ai] Result fetch error:', error);
        return {
            videoUrl: '',
            durationMs: 0,
            status: 'in_progress',
            requestId,
        };
    }
}


// Get result when job is completed
export async function getVideoResult(requestId: string, model: VideoModel = 'hailuo'): Promise<VideoResult> {
    const endpoint = MODEL_ENDPOINTS[model];

    try {
        const response = await fetch(`${FAL_API_URL}/${endpoint}/requests/${requestId}`, {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get result: ${response.status}`);
        }

        const data = await response.json();
        console.log('Get result response:', JSON.stringify(data, null, 2));

        // Hailuo returns video.url directly
        const videoUrl = data.video?.url || '';

        return {
            videoUrl,
            durationMs: 6000, // Default to 6 seconds
            status: videoUrl ? 'completed' : 'failed',
        };
    } catch (error) {
        console.error('Get result error:', error);
        throw error;
    }
}

export async function testFalConnection(): Promise<boolean> {
    try {
        const response = await fetch(`${FAL_API_URL}/fal-ai/flux/dev`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_API_KEY}`,
            },
            body: JSON.stringify({
                prompt: 'test',
                num_images: 1,
            }),
        });
        return response.ok || response.status === 422; // 422 = validation error but auth works
    } catch {
        return false;
    }
}
