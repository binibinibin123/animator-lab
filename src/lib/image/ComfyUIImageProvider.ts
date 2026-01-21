// ComfyUI Image Provider for local image generation
// Uses Qwen 2511 Image Edit workflow

import type { ImageProvider, ImageGenerationRequest, ImageResult } from './ImageProvider';
import { createServerClient } from '@/lib/supabase';
import { IMAGE_WORKFLOWS, ImageWorkflowId } from './imageWorkflows';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188';

interface ComfyUIHistoryOutput {
    images?: Array<{ filename: string; subfolder: string; type: string }>;
}

interface ComfyUIHistoryEntry {
    status: { status_str: string; completed: boolean; messages: string[][] };
    outputs: Record<string, ComfyUIHistoryOutput>;
}

export class ComfyUIImageProvider implements ImageProvider {
    readonly name = 'comfyui' as const;
    private workflowId: ImageWorkflowId = 'qwen-2511';

    async generateImage(request: ImageGenerationRequest): Promise<ImageResult> {
        const { prompt, referenceImageUrl, style } = request;

        console.log(`[ComfyUIImageProvider] Generating image with prompt: ${prompt.slice(0, 50)}...`);

        // 1. Upload reference image if provided
        let imageFilename = 'placeholder.png';
        if (referenceImageUrl) {
            imageFilename = await this.uploadSourceImage(referenceImageUrl);
            console.log(`[ComfyUIImageProvider] Reference image uploaded: ${imageFilename}`);
        }

        // 2. Build workflow
        const workflow = this.buildWorkflow(imageFilename, prompt, style);

        // 3. Submit to ComfyUI
        const promptId = await this.submitJob(workflow);
        console.log(`[ComfyUIImageProvider] Job submitted: ${promptId}`);

        // 4. Poll for completion
        const outputFile = await this.pollForCompletion(promptId);
        console.log(`[ComfyUIImageProvider] Output file: ${outputFile.filename}`);

        // 5. Download and upload to Supabase
        const localUrl = `${COMFYUI_BASE_URL}/view?filename=${outputFile.filename}&subfolder=${outputFile.subfolder}&type=${outputFile.type}`;
        const publicUrl = await this.uploadToStorage(localUrl, outputFile.filename);

        console.log(`[ComfyUIImageProvider] Image uploaded: ${publicUrl}`);

        return {
            imageUrl: publicUrl,
            width: 1024,
            height: 1024
        };
    }

    private async uploadSourceImage(imageUrl: string): Promise<string> {
        try {
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
            const imageBlob = await imageResponse.blob();

            const formData = new FormData();
            const filename = `upload_${Date.now()}.png`;
            formData.append('image', imageBlob, filename);
            formData.append('overwrite', 'true');

            const uploadResponse = await fetch(`${COMFYUI_BASE_URL}/upload/image`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const text = await uploadResponse.text();
                throw new Error(`ComfyUI upload failed: ${text}`);
            }

            const result = await uploadResponse.json();
            return result.name;

        } catch (error) {
            console.error('[ComfyUIImageProvider] Failed to upload source image:', error);
            throw error;
        }
    }

    private buildWorkflow(imageFilename: string, prompt: string, style?: string): Record<string, any> {
        const workflowConfig = IMAGE_WORKFLOWS[this.workflowId];
        if (!workflowConfig) {
            throw new Error(`Unknown workflow ID: ${this.workflowId}`);
        }

        const workflow = JSON.parse(JSON.stringify(workflowConfig.workflow)) as Record<string, any>;

        // Node 19: Input Image
        if (workflow["19"] && workflow["19"].inputs) {
            workflow["19"].inputs.image = imageFilename;
        }

        // Node 13: Positive Prompt - Qwen Image Edit optimized
        if (workflow["13"] && workflow["13"].inputs) {
            const optimizedPrompt = this.buildQwenPrompt(prompt, style);
            workflow["13"].inputs.prompt = optimizedPrompt;
            console.log(`[ComfyUIImageProvider] Optimized prompt: ${optimizedPrompt.slice(0, 100)}...`);
        }

        // Node 15: KSampler (Seed)
        if (workflow["15"] && workflow["15"].inputs) {
            workflow["15"].inputs.seed = Math.floor(Math.random() * 1000000000000);
        }

        // Node 17: SaveImage (filename prefix)
        if (workflow["17"] && workflow["17"].inputs) {
            workflow["17"].inputs.filename_prefix = `autovideo_img_${Date.now()}`;
        }

        return workflow;
    }

    /**
     * Qwen Image Edit 2511 style presets
     */
    private static readonly QWEN_STYLE_PRESETS: Record<string, string> = {
        'senior-1': '3D rendered minimalist stickman character with a fluffy white beard and black bead eyes. Soft lighting, clean white background, high quality 3D render style.',
        'economy-1': 'Simple flat vector illustration on a solid pure white background. Minimalist stickman character. Clean lines, no shadows, no gradients.',
        'anime': 'Anime illustration style, vibrant colors, detailed character design, clean lines.',
        'realistic': 'Photorealistic rendering, high detail, professional photography lighting.',
        'digital-art': 'Digital art style, concept art quality, trending on artstation.',
        'cinematic': 'Cinematic composition, dramatic lighting, movie scene aesthetic.',
        'cartoon': 'Cartoon style, bold outlines, bright colorful palette.',
        '3d-render': '3D rendered style, octane render quality, unreal engine aesthetic.',
    };

    /**
     * Build optimized prompt for Qwen Image Edit 2511 model
     * 
     * Best practices:
     * - Be clear and specific
     * - Use preservation phrases to prevent unwanted changes
     * - Structure: subject → environment → style
     * - Keep 1-3 sentences per instruction
     */
    private buildQwenPrompt(originalPrompt: string, style?: string): string {
        // Extract scene description from the original prompt
        const sceneDescription = originalPrompt
            .replace(/^Scene depicting:\s*/i, '')
            .trim();

        // Get style-specific modifier
        const styleModifier = style
            ? (ComfyUIImageProvider.QWEN_STYLE_PRESETS[style] || ComfyUIImageProvider.QWEN_STYLE_PRESETS['economy-1'])
            : ComfyUIImageProvider.QWEN_STYLE_PRESETS['economy-1'];

        // Check if this is economy style (needs white background)
        const isEconomyStyle = style === 'economy-1' || style === 'senior-1' || !style;

        // Build Qwen-optimized prompt
        const promptParts: string[] = [];

        // Main scene instruction with action emphasis
        promptParts.push(`Create an illustration showing: ${sceneDescription}.`);

        // Dynamic pose instruction
        promptParts.push(`The character should have expressive poses, gestures, and facial expressions that match the scene. Show action and emotion.`);

        // Background instruction (critical for economy style)
        if (isEconomyStyle) {
            promptParts.push(`Background: Solid pure white background (#FFFFFF). No transparency, no gradients, no patterns.`);
        }

        // Style directive (important for Qwen)
        promptParts.push(`Style: ${styleModifier}`);

        // Character identity (keep visual style but allow dynamic poses)
        promptParts.push(`Keep the character's visual identity (stickman design, hat) from the reference image, but adapt pose and expression to match the scene.`);

        // Output quality
        promptParts.push(`High quality, clean composition, no text, no watermarks, no transparency.`);

        return promptParts.join(' ');
    }

    private async submitJob(workflow: Record<string, any>): Promise<string> {
        const response = await fetch(`${COMFYUI_BASE_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: workflow }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ComfyUI submission failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.prompt_id;
    }

    private async pollForCompletion(promptId: string, maxAttempts = 150, intervalMs = 2000): Promise<{ filename: string; subfolder: string; type: string }> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));

            try {
                const response = await fetch(`${COMFYUI_BASE_URL}/history/${promptId}`);
                if (!response.ok) {
                    if (response.status === 404) continue; // Still queued
                    throw new Error(`Failed to get history: ${response.status}`);
                }

                const history = await response.json();
                const entry = history[promptId] as ComfyUIHistoryEntry | undefined;

                if (!entry) continue;

                if (entry.status?.completed) {
                    // Find SaveImage output (node 17)
                    const saveImageOutput = entry.outputs["17"];
                    if (saveImageOutput?.images?.[0]) {
                        return saveImageOutput.images[0];
                    }

                    // Fallback: search all outputs
                    for (const nodeId of Object.keys(entry.outputs)) {
                        const output = entry.outputs[nodeId];
                        if (output.images?.[0]) {
                            return output.images[0];
                        }
                    }

                    throw new Error('No output image found');
                }
            } catch (error) {
                console.error(`[ComfyUIImageProvider] Poll attempt ${attempt + 1} error:`, error);
            }
        }

        throw new Error('Polling timeout: Image generation took too long');
    }

    private async uploadToStorage(localUrl: string, filename: string): Promise<string> {
        try {
            const response = await fetch(localUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status}`);
            }

            const blob = await response.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());

            const supabase = createServerClient();
            const storagePath = `images/${Date.now()}_${filename}`;

            const { error } = await supabase.storage
                .from('media')
                .upload(storagePath, buffer, {
                    contentType: 'image/png',
                    upsert: true,
                });

            if (error) {
                console.error('[ComfyUIImageProvider] Storage upload error:', error);
                // WARNING: Do NOT return base64 here as it will pollute the database and cause timeouts
                throw new Error(`Failed to upload image to storage: ${error.message} (Bucket 'media' missing?)`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(storagePath);

            return publicUrl;
        } catch (error) {
            console.error('[ComfyUIImageProvider] Upload failed:', error);
            return localUrl;
        }
    }
}
