// fal.ai API for video generation (Hailuo 2.3, Kling 2.6)

const FAL_API_KEY = process.env.FAL_API_KEY!;
const FAL_API_URL = 'https://queue.fal.run';

export type VideoModel = 'hailuo' | 'kling';

export interface VideoGenerationOptions {
    imageUrl: string;
    model?: VideoModel;
    motion?: string;
    duration?: number; // seconds
    fps?: number;
}

export interface VideoResult {
    videoUrl: string;
    durationMs: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Model endpoints
const MODEL_ENDPOINTS: Record<VideoModel, string> = {
    hailuo: 'fal-ai/minimax-video', // Hailuo/MiniMax
    kling: 'fal-ai/kling-video/v2', // Kling 2.6
};

export async function generateVideo(options: VideoGenerationOptions): Promise<VideoResult> {
    const {
        imageUrl,
        model = 'hailuo',
        motion = 'auto',
        duration = 5,
    } = options;

    const endpoint = MODEL_ENDPOINTS[model];

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
                prompt: motion === 'auto' ? 'gentle motion, cinematic' : motion,
                duration: duration,
            }),
        });

        if (!submitResponse.ok) {
            // Try fallback model
            if (model === 'hailuo') {
                console.log('Hailuo failed, trying Kling fallback...');
                return generateVideo({ ...options, model: 'kling' });
            }
            throw new Error(`fal.ai API error: ${submitResponse.status}`);
        }

        const data = await submitResponse.json();

        return {
            videoUrl: data.video?.url || data.output?.video_url || '',
            durationMs: duration * 1000,
            status: data.status === 'completed' ? 'completed' : 'processing',
        };
    } catch (error) {
        console.error('fal.ai API error:', error);
        throw error;
    }
}

// Poll for job status (for async processing)
export async function checkVideoStatus(requestId: string, model: VideoModel = 'hailuo'): Promise<VideoResult> {
    const endpoint = MODEL_ENDPOINTS[model];

    try {
        const response = await fetch(`${FAL_API_URL}/${endpoint}/requests/${requestId}/status`, {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to check status: ${response.status}`);
        }

        const data = await response.json();

        return {
            videoUrl: data.video?.url || data.output?.video_url || '',
            durationMs: data.duration ? data.duration * 1000 : 0,
            status: data.status,
        };
    } catch (error) {
        console.error('Status check error:', error);
        throw error;
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

        return {
            videoUrl: data.video?.url || data.output?.video_url || '',
            durationMs: data.duration ? data.duration * 1000 : 5000,
            status: 'completed',
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
