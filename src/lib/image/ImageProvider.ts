// Image Provider interface for abstraction
// Supports cloud image generation providers

export interface ImageProvider {
    readonly name: 'gemini';
    generateImage(request: ImageGenerationRequest): Promise<ImageResult>;
}

export interface ImageGenerationRequest {
    prompt: string;
    negativePrompt?: string;
    referenceImageUrl?: string;
    style?: string;
    resolution?: '2K' | '4K';
}

export interface ImageResult {
    imageUrl: string;
    width: number;
    height: number;
}
