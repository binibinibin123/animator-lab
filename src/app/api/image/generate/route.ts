import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateImage, scriptToImagePrompt } from '@/lib/ai/nanobanana';
import path from 'path';
import fs from 'fs';

// POST /api/image/generate - Generate image for a segment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, scriptText, style, aspectRatio, resolution, segmentId } = body;

        // Use provided prompt or generate from script
        const imagePrompt = prompt || scriptToImagePrompt(scriptText || '', style || 'anime');

        if (!imagePrompt) {
            return NextResponse.json(
                { error: 'Prompt or scriptText is required' },
                { status: 400 }
            );
        }

        // Prepare reference image if a preset style is selected (not custom)
        let referenceImage: string | undefined;
        if (style && style !== 'custom') {
            try {
                const stylePath = path.join(process.cwd(), 'public', 'styles', `${style}.png`);
                if (fs.existsSync(stylePath)) {
                    const imageBuffer = fs.readFileSync(stylePath);
                    referenceImage = imageBuffer.toString('base64');
                    // console.log(`Loaded reference image for style: ${style}`);
                }
            } catch (err) {
                console.warn(`Failed to load reference image for style ${style}:`, err);
            }
        }

        // Generate image
        const result = await generateImage({
            prompt: imagePrompt,
            style: style || 'anime',
            aspectRatio: aspectRatio || '16:9',
            resolution: resolution || '2K',
            referenceImage, // Pass the base64 reference image
        });

        // If segmentId provided, update segment
        if (segmentId) {
            const supabase = createServerClient();
            await supabase
                .from('segments')
                .update({ image_url: result.imageUrl } as never)
                .eq('id', segmentId);
        }

        return NextResponse.json({
            success: true,
            imageUrl: result.imageUrl,
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
