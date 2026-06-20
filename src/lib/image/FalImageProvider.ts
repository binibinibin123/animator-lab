import { fal } from '@fal-ai/client';
import {
    IMAGE_MODEL_REGISTRY,
    resolveImageQuality,
    type ImageModelId,
    type ImageQuality,
} from '@/lib/models/registry';
import type { ImageResult } from '@/lib/ai/nanobanana';

fal.config({
    credentials: process.env.FAL_KEY,
});

type AspectRatio = '16:9' | '1:1' | '3:4' | '9:16';
type FalImageSize = 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';

interface FalImageFile {
    url?: string;
    width?: number;
    height?: number;
}

interface FalImageResponse {
    images?: FalImageFile[];
}

export interface FalImageGenerationOptions {
    modelId: ImageModelId;
    prompt: string;
    aspectRatio?: AspectRatio;
    quality?: string;
    referenceImage?: string;
    referenceMimeType?: string;
}

export function resolveFalImageSize(aspectRatio: AspectRatio | undefined, fallback: FalImageSize): FalImageSize {
    switch (aspectRatio) {
        case '9:16':
            return 'portrait_16_9';
        case '1:1':
            return 'square_hd';
        case '3:4':
            return 'portrait_4_3';
        case '16:9':
            return 'landscape_16_9';
        default:
            return fallback;
    }
}

async function uploadReferenceImage(base64Payload: string, mimeType: string): Promise<string> {
    const buffer = Buffer.from(base64Payload, 'base64');
    const blob = new Blob([buffer], { type: mimeType || 'image/png' });
    return fal.storage.upload(blob, { lifecycle: { expiresIn: '1d' } });
}

function buildFalImageInput(options: {
    prompt: string;
    imageSize: FalImageSize;
    quality: ImageQuality;
    referenceImageUrl?: string;
}) {
    return {
        prompt: options.prompt,
        image_size: options.imageSize,
        quality: options.quality,
        num_images: 1,
        output_format: 'png',
        ...(options.referenceImageUrl ? { image_urls: [options.referenceImageUrl] } : {}),
    };
}

export async function generateFalImage(options: FalImageGenerationOptions): Promise<ImageResult> {
    const model = IMAGE_MODEL_REGISTRY[options.modelId];
    if (!model || model.provider !== 'fal') {
        throw new Error(`Unsupported fal image model: ${options.modelId}`);
    }

    if (!process.env.FAL_KEY) {
        throw new Error('FAL_KEY is not configured. Please set the environment variable.');
    }

    const quality = resolveImageQuality(options.modelId, options.quality);
    const imageSize = resolveFalImageSize(options.aspectRatio, model.defaultImageSize);

    const referenceImageUrl = options.referenceImage
        ? await uploadReferenceImage(options.referenceImage, options.referenceMimeType || 'image/png')
        : undefined;
    const endpoint = referenceImageUrl && model.editEndpoint ? model.editEndpoint : model.endpoint;
    const input = buildFalImageInput({
        prompt: options.prompt,
        imageSize,
        quality,
        referenceImageUrl,
    });

    const result = await fal.subscribe(endpoint, {
        input,
        logs: true,
    });
    const data = result.data as FalImageResponse;
    const image = data.images?.[0];

    if (!image?.url) {
        throw new Error('fal image model did not return an image URL.');
    }

    return {
        imageUrl: image.url,
        width: image.width || 1024,
        height: image.height || 1024,
    };
}
