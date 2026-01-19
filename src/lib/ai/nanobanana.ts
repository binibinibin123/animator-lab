// Nano Banana (Gemini 2.5 Flash Image) for image generation
// This uses the Google AI Studio Generative Language API

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const MODEL_NAME = 'gemini-2.5-flash-image';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

export interface ImageGenerationOptions {
    prompt: string;
    negativePrompt?: string;
    style?: string;
    aspectRatio?: '16:9' | '1:1' | '3:4' | '9:16';
    resolution?: '2K' | '4K';
    referenceImage?: string; // Base64 encoded image data
    referenceMimeType?: string; // e.g., 'image/png' or 'image/jpeg'
}

export interface ImageResult {
    imageUrl: string;
    width: number;
    height: number;
}

// Style presets with their prompt modifiers
export const STYLE_PRESETS: Record<string, string> = {
    'economy-1': 'A cute white stickman character with a yellow square hat displaying Won symbol (₩), simple flat vector illustration style, bright cheerful colors, Korean financial and economic theme, educational cartoon for YouTube',
    'anime': 'anime style, vibrant colors, detailed illustration',
    'realistic': 'photorealistic, high detail, 8k, professional photography',
    'digital-art': 'digital art, concept art, artstation trending',
    'illustration': 'illustration, clean lines, professional artwork',
    'cinematic': 'cinematic lighting, movie scene, dramatic composition',
    'cartoon': 'cartoon style, bold outlines, colorful',
    'watercolor': 'watercolor painting, soft colors, artistic',
    'minimalist': 'minimalist design, clean, simple shapes',
    '3d-render': '3D render, octane render, unreal engine 5',
    'vintage': 'vintage style, retro, nostalgic colors',
    'neon': 'neon lights, cyberpunk, glowing effects',
    'sketch': 'pencil sketch, hand-drawn, artistic sketch',
};

export async function generateImage(options: ImageGenerationOptions): Promise<ImageResult> {
    const {
        prompt,
        style = 'anime',
        aspectRatio = '16:9',
        referenceImage,
        referenceMimeType = 'image/png',
    } = options;

    const styleModifier = STYLE_PRESETS[style] || '';

    // For Gemini 2.5 Flash Image, we use a structured prompt
    let fullPrompt = `Generate a high-quality ${aspectRatio} image of the following scene: ${prompt}. Style: ${styleModifier}.`;

    if (referenceImage) {
        fullPrompt += " Please generate the image using the provided image as a style reference. Match the color palette, lighting, and artistic technique of the reference image.";
    }

    const parts: any[] = [{ text: fullPrompt }];

    if (referenceImage) {
        parts.push({
            inlineData: {
                mimeType: referenceMimeType,
                data: referenceImage
            }
        });
    }

    // Validate API key
    if (!GOOGLE_AI_API_KEY) {
        throw new Error('GOOGLE_AI_API_KEY is not configured. Please set the environment variable.');
    }

    console.log('Calling Gemini Image API with prompt:', fullPrompt.slice(0, 100) + '...');

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_AI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GOOGLE_AI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{
                    parts: parts
                }],
                generationConfig: {
                    responseModalities: ["IMAGE", "TEXT"],
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API error response:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`Gemini Image API error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
        }

        const responseData = await response.json();
        console.log('[Gemini] Full response:', JSON.stringify(responseData, null, 2).slice(0, 1000));

        const candidate = responseData.candidates?.[0];
        const responseParts = candidate?.content?.parts || [];

        console.log('[Gemini] Response parts count:', responseParts.length);

        // Look for image data in any part
        for (const part of responseParts) {
            if (part.inlineData && part.inlineData.data) {
                const base64Data = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/jpeg';
                const imageUrl = `data:${mimeType};base64,${base64Data}`;

                console.log('[Gemini] Found image data, mimeType:', mimeType, 'size:', base64Data.length);
                return {
                    imageUrl,
                    width: 1024,
                    height: 1024,
                };
            } else if (part.text) {
                console.log('[Gemini] Found text part:', part.text.slice(0, 200));
            }
        }

        // No image found in any part
        console.error('[Gemini] No image data found in response. Prompt safety or model limitation?');
        throw new Error('Gemini did not return image data. Model may not support image generation for this prompt.');
    } catch (error) {
        console.error('Gemini image generation error:', error);
        throw error;
    }
}

// Generate image prompt from script text
export function scriptToImagePrompt(scriptText: string, style: string): string {
    const cleanText = scriptText
        .replace(/[.,!?]/g, '')
        .slice(0, 500);

    return `Scene depicting: ${cleanText}`;
}

export async function testNanoBananaConnection(): Promise<boolean> {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_AI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'test' }] }],
            }),
        });
        return response.ok;
    } catch {
        return false;
    }
}
