// Image Provider interface for abstraction
// Supports cloud image generation providers

export interface ImageProvider {
    readonly name: 'gemini' | 'fal';
    generateImage(request: ImageGenerationRequest): Promise<ImageResult>;
}

export interface ImageGenerationRequest {
    prompt: string;
    negativePrompt?: string;
    referenceImageUrl?: string;
    referenceImage?: string;
    referenceMimeType?: string;
    referenceIntent?: 'character' | 'style' | null;
    style?: string;
    styleText?: string | null;
    aspectRatio?: '16:9' | '1:1' | '3:4' | '9:16';
    quality?: 'low' | 'medium' | 'high';
    modelId?: string;
}

export interface ImageResult {
    imageUrl: string;
    width: number;
    height: number;
}
