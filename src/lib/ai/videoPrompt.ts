// Video prompt generation using Gemini Vision
// Analyzes image and script to create static/subtle motion video prompts

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const GEMINI_VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface VideoPromptOptions {
    imageUrl: string;        // URL of the generated image
    scriptText?: string;     // Optional script/narration for context
    visualDescription?: string; // Optional visual description used for image gen
    style?: string;          // Optional style ID (e.g., 'economy-1')
}

export interface VideoPromptResult {
    prompt: string;          // Generated video prompt
    imageAnalysis: string;   // Brief description of the image content
    suggestedMotion: string; // Suggested motion type
}

/**
 * Analyzes an image and generates a video prompt suitable for AI video generation.
 * Focuses on subtle, static camera movements to avoid AI video artifacts.
 */
export async function generateVideoPrompt(options: VideoPromptOptions): Promise<VideoPromptResult> {
    const { imageUrl, scriptText, visualDescription, style } = options;

    let systemPrompt = `You are an AI video prompt specialist. Your job is to analyze images and create prompts for AI video generation that result in high-quality, artifact-free videos.

CRITICAL RULES for AI video generation:
1. CAMERA: Always keep the camera FIXED (no pan, zoom, or tracking shots)
2. MOTION: Only subtle, gentle movements (slight wind, breathing, ambient motion)
3. AVOID: Fast movements, complex actions, transformations, or dramatic gestures
4. FOCUS: Static scenes with minimal, natural micro-movements
`;

    // Enforce stricter motion rules for economy-1 style to prevent stickman morphing
    if (style === 'economy-1' || style === 'senior-1') {
        systemPrompt += `
SPECIAL RULES for Simple/Cartoon Style:
5. MINIMALISM: This is a stickman/cartoon style. Use EXTREMELY subtle motion.
6. NO MORPHING: Do NOT ask for character movement (walking, waving). Only background ambiance or static hold.
`;
    }

    systemPrompt += `
Good motion examples:
- "Subtle wind moving through hair"
- "Gentle breathing motion"
- "Soft light flickering"
- "Slight ambient movement"
- "Particles floating slowly"
- "Water rippling gently"
- "Leaves rustling softly"

Bad motion examples (AVOID):
- "Camera zooms in"
- "Person walks toward camera"
- "Dramatic gesture"
- "Object transforms"
- "Fast action sequence"

Your output should be a single, concise video prompt that:
1. Describes the static scene
2. Specifies FIXED camera
3. Adds only subtle ambient motion appropriate to the scene
4. Is under 100 words`;

    const contextInfo = [
        scriptText ? `Script/Narration: "${scriptText}"` : '',
        visualDescription ? `Visual context: ${visualDescription}` : '',
    ].filter(Boolean).join('\n');

    const userPrompt = `Analyze this image and generate a video prompt for AI video generation.

${contextInfo}

Respond in JSON format:
{
  "imageAnalysis": "Brief description of what's in the image (1-2 sentences)",
  "suggestedMotion": "Type of subtle motion that fits this scene (e.g., 'gentle wind', 'soft breathing', 'ambient particles')",
  "prompt": "Complete video prompt with fixed camera and subtle motion"
}`;

    try {
        // Check if imageUrl is a base64 data URL or a regular URL
        let imageData: { inlineData?: { mimeType: string; data: string }; fileData?: { fileUri: string } };

        if (imageUrl.startsWith('data:')) {
            // Extract base64 data from data URL
            const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                imageData = {
                    inlineData: {
                        mimeType: matches[1],
                        data: matches[2],
                    },
                };
            } else {
                throw new Error('Invalid base64 data URL format');
            }
        } else {
            // For external URLs, we need to fetch and convert to base64
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(imageBuffer).toString('base64');
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

            imageData = {
                inlineData: {
                    mimeType: contentType,
                    data: base64,
                },
            };
        }

        const response = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: systemPrompt },
                            imageData,
                            { text: userPrompt },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 1024,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini Vision API error:', errorText);
            throw new Error(`Gemini Vision API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from Gemini Vision');
        }

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            // Fallback if JSON parsing fails
            return {
                prompt: 'Static scene with fixed camera. Subtle ambient motion. Gentle breathing effect.',
                imageAnalysis: 'Unable to analyze image',
                suggestedMotion: 'subtle ambient motion',
            };
        }

        const result = JSON.parse(jsonMatch[0]);

        return {
            prompt: result.prompt || 'Static scene, fixed camera, subtle ambient motion',
            imageAnalysis: result.imageAnalysis || '',
            suggestedMotion: result.suggestedMotion || 'subtle motion',
        };
    } catch (error) {
        console.error('Video prompt generation error:', error);

        // Return a safe fallback prompt
        return {
            prompt: 'Static cinematic scene. Fixed camera position. Gentle ambient motion with soft lighting.',
            imageAnalysis: 'Fallback due to analysis error',
            suggestedMotion: 'gentle ambient motion',
        };
    }
}

/**
 * Quick prompt generation without image analysis (for use when image analysis is not possible)
 */
export function generateQuickVideoPrompt(scriptText: string, visualDescription?: string): string {
    // Extract key elements from the visual description or script
    const context = visualDescription || scriptText;

    // Common safe motion patterns
    const safeMotions = [
        'subtle ambient motion',
        'gentle breathing effect',
        'soft light fluctuation',
        'minimal natural movement',
    ];

    const randomMotion = safeMotions[Math.floor(Math.random() * safeMotions.length)];

    return `Static scene. Fixed camera. ${randomMotion}. Cinematic atmosphere.`;
}
