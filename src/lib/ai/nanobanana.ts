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
}

export interface ImageResult {
    imageUrl: string;
    width: number;
    height: number;
}

// Style presets with their prompt modifiers
export const STYLE_PRESETS: Record<string, string> = {
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
    } = options;

    const styleModifier = STYLE_PRESETS[style] || '';

    // For Gemini 2.5 Flash Image, we use a structured prompt
    const fullPrompt = `Generate a high-quality ${aspectRatio} image of the following scene: ${prompt}. Style: ${styleModifier}.`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_AI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topP: 0.9,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini Image API error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const part = data.candidates?.[0]?.content?.parts?.[0];

        if (!part) {
            throw new Error('Invalid response from Gemini Image API');
        }

        // Gemini image models return the image as binary data in inlineData
        if (part.inlineData && part.inlineData.data) {
            const base64Data = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/jpeg';
            const imageUrl = `data:${mimeType};base64,${base64Data}`;

            return {
                imageUrl,
                width: 1024,
                height: 1024,
            };
        } else {
            console.warn('Gemini returned text instead of image data:', part.text);
            throw new Error('Gemini did not return image data');
        }
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
