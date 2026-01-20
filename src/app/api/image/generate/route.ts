import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateImage, scriptToImagePrompt } from '@/lib/ai/nanobanana';
import { generateVideoPrompt } from '@/lib/ai/videoPrompt';
import { ComfyUIImageProvider } from '@/lib/image';
import path from 'path';
import fs from 'fs';

// POST /api/image/generate - Generate image for a segment
export async function POST(request: NextRequest) {
    console.log('[Image API] Received request');
    try {
        const body = await request.json();
        const { prompt, scriptText, style, aspectRatio, resolution, segmentId, provider = 'comfyui' } = body;
        console.log('[Image API] Request body:', { prompt: prompt?.slice(0, 50), scriptText: scriptText?.slice(0, 50), style, aspectRatio, resolution, segmentId, provider });

        // Use provided prompt or generate from script
        const imagePrompt = prompt || scriptToImagePrompt(scriptText || '', style || 'anime');

        if (!imagePrompt) {
            return NextResponse.json(
                { error: 'Prompt or scriptText is required' },
                { status: 400 }
            );
        }

        console.log('[Image API] Generated prompt:', imagePrompt.slice(0, 100));

        let result: { imageUrl: string; width: number; height: number };

        if (provider === 'comfyui') {
            // ComfyUI Local Image Generation
            console.log('[Image API] Using ComfyUI provider...');

            // Get reference image URL from style (if exists)
            let referenceImageUrl: string | undefined;
            if (style && style !== 'custom') {
                const extensions = ['png', 'jpg', 'jpeg'];
                for (const ext of extensions) {
                    const stylePath = path.join(process.cwd(), 'public', 'styles', `${style}.${ext}`);
                    if (fs.existsSync(stylePath)) {
                        // Convert local file to data URL for upload
                        const imageBuffer = fs.readFileSync(stylePath);
                        const base64 = imageBuffer.toString('base64');
                        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                        referenceImageUrl = `data:${mimeType};base64,${base64}`;
                        console.log(`[Image API] Loaded reference image: ${style}.${ext}`);
                        break;
                    }
                }
            }

            const comfyProvider = new ComfyUIImageProvider();
            result = await comfyProvider.generateImage({
                prompt: imagePrompt,
                referenceImageUrl,
                style,
                resolution: resolution || '2K',
            });
        } else {
            // Gemini Cloud Image Generation (Original)
            console.log('[Image API] Using Gemini provider...');

            // Prepare reference image
            let referenceImage: string | undefined;
            let referenceMimeType: string = 'image/png';
            if (style && style !== 'custom') {
                const extensions = ['png', 'jpg', 'jpeg'];
                for (const ext of extensions) {
                    try {
                        const stylePath = path.join(process.cwd(), 'public', 'styles', `${style}.${ext}`);
                        if (fs.existsSync(stylePath)) {
                            const imageBuffer = fs.readFileSync(stylePath);
                            referenceImage = imageBuffer.toString('base64');
                            referenceMimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                            console.log(`[Image API] Loaded reference image for style: ${style}.${ext}, mimeType: ${referenceMimeType}, size: ${referenceImage.length} chars`);
                            break;
                        }
                    } catch (err) {
                        console.warn(`[Image API] Failed to load reference image for style ${style}.${ext}:`, err);
                    }
                }
                if (!referenceImage) {
                    console.log(`[Image API] No reference image found for style: ${style}`);
                }
            }

            result = await generateImage({
                prompt: imagePrompt,
                style: style || 'anime',
                aspectRatio: aspectRatio || '16:9',
                resolution: resolution || '2K',
                referenceImage,
                referenceMimeType,
            });
        }

        // Generate video prompt from the new image
        let generatedVideoPrompt = null;
        try {
            console.log('[Image API] Generating video prompt...');
            const videoPromptResult = await generateVideoPrompt({
                imageUrl: result.imageUrl,
                scriptText: scriptText,
                visualDescription: prompt, // proper visual description is passed as 'prompt' in body
                style: style,
            });
            generatedVideoPrompt = videoPromptResult.prompt;
            console.log('[Image API] Video prompt generated:', generatedVideoPrompt);
        } catch (vpError) {
            console.error('[Image API] Failed to generate video prompt:', vpError);
            // Fallback to simpler prompt if Gemini analysis fails
            generatedVideoPrompt = 'Static scene. Fixed camera. Subtle ambient motion.';
        }

        // If segmentId provided, update segment with image AND video prompt
        if (segmentId) {
            const supabase = createServerClient();

            // 1. Update image_url (Critical)
            const { error: imageError } = await supabase
                .from('segments')
                .update({ image_url: result.imageUrl } as never)
                .eq('id', segmentId);

            if (imageError) {
                console.error('[Image API] Failed to update image_url:', imageError);
                throw new Error('Failed to save image URL to database');
            }

            // 2. Update video_prompt (Optional - failure shouldn't fail the request)
            if (generatedVideoPrompt) {
                const { error: promptError } = await supabase
                    .from('segments')
                    .update({ video_prompt: generatedVideoPrompt } as never)
                    .eq('id', segmentId);

                if (promptError) {
                    console.warn('[Image API] Failed to update video_prompt (likely missing column):', promptError.message);
                }
            }

            // 3. Update project thumbnail if this is the first segment
            const { data: segmentData } = await supabase
                .from('segments')
                .select('order_index, project_id')
                .eq('id', segmentId)
                .single();

            const seg = segmentData as { order_index: number; project_id: string } | null;
            if (seg && seg.order_index === 0) {
                const { error: thumbnailError } = await supabase
                    .from('projects')
                    .update({ thumbnail_url: result.imageUrl } as never)
                    .eq('id', seg.project_id);

                if (thumbnailError) {
                    console.warn('[Image API] Failed to update project thumbnail:', thumbnailError.message);
                } else {
                    console.log('[Image API] Updated project thumbnail for project:', seg.project_id);
                }
            }
        }

        return NextResponse.json({
            success: true,
            imageUrl: result.imageUrl,
            videoPrompt: generatedVideoPrompt, // Return this so frontend can update state if needed
            width: result.width,
            height: result.height,
        });
    } catch (error: any) {
        console.error('Image generation error:', error);

        // Identify specific error types
        let errorMessage = 'Failed to generate image';
        if (error.message.includes('API key')) errorMessage = 'API 키가 설정되지 않았습니다.';
        else if (error.message.includes('timout')) errorMessage = '생성 시간이 초과되었습니다.';

        return NextResponse.json(
            { error: errorMessage, details: error.message },
            { status: 500 }
        );
    }
}
