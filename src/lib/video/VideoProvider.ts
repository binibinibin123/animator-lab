// Video Provider Interface and Types
// Abstraction layer for video generation providers

export type VideoProviderType = 'fal';

export type VideoJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface VideoGenerationRequest {
    imageUrl: string;
    motionPrompt: string;
    duration?: number;
    segmentId: string;
    style?: string;
    modelId?: string;
}

export interface VideoGenerationResult {
    jobId: string;
    externalJobId?: string;
    status: VideoJobStatus;
    progress: number; // 0-1
    videoUrl?: string;
    error?: string;
    logs?: string[];
}

export interface VideoProvider {
    readonly name: VideoProviderType;

    /**
     * Submit a video generation job
     * @returns jobId (external provider's job ID)
     */
    submitJob(request: VideoGenerationRequest): Promise<{ externalJobId: string }>;

    /**
     * Check the status of a submitted job
     * @param externalJobId - The provider's job ID
     */
    checkStatus(externalJobId: string, modelId?: string): Promise<{
        status: VideoJobStatus;
        progress: number;
        videoUrl?: string;
        error?: string;
    }>;
    /**
     * Cancel a running or queued job
     * @param externalJobId - The provider's job ID
     */
    cancelJob?(externalJobId: string, modelId?: string): Promise<boolean>;
}

// Factory function to get the appropriate provider
export function getVideoProvider(type: VideoProviderType): VideoProvider {
    switch (type) {
        case 'fal': {
            // Lazy import to avoid circular dependencies
            const { FalVideoProvider } = require('./FalVideoProvider');
            return new FalVideoProvider();
        }
        default:
            throw new Error(`Unknown video provider: ${type}`);
    }
}
