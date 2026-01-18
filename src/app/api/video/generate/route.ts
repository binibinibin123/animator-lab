import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVideo, checkVideoStatus } from '@/lib/ai/fal';
import type { VideoModel } from '@/lib/ai/fal';

// POST /api/video/generate - Generate video from image
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { imageUrl, model, motion, duration, segmentId } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { error: 'Image URL is required' },
                { status: 400 }
            );
        }

        // Generate video
        const result = await generateVideo({
            imageUrl,
            model: (model as VideoModel) || 'hailuo',
            motion: motion || 'auto',
            duration: duration || 5,
        });

        // If segmentId provided, update segment
        if (segmentId && result.videoUrl) {
            const supabase = createServerClient();
            await supabase
                .from('segments')
                .update({
                    video_url: result.videoUrl,
                    duration_ms: result.durationMs,
                } as never)
                .eq('id', segmentId);
        }

        return NextResponse.json({
            success: true,
            videoUrl: result.videoUrl,
            durationMs: result.durationMs,
            status: result.status,
        });
    } catch (error) {
        console.error('Video generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate video' },
            { status: 500 }
        );
    }
}

// GET /api/video/generate?requestId=xxx&model=hailuo - Check video status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('requestId');
        const model = (searchParams.get('model') as VideoModel) || 'hailuo';

        if (!requestId) {
            return NextResponse.json(
                { error: 'Request ID is required' },
                { status: 400 }
            );
        }

        const result = await checkVideoStatus(requestId, model);

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json(
            { error: 'Failed to check status' },
            { status: 500 }
        );
    }
}
