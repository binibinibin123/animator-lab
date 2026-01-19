// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVideo, checkVideoStatus } from '@/lib/ai/fal';
import { generateVideoPrompt } from '@/lib/ai/videoPrompt';
import type { VideoModel } from '@/lib/ai/fal';

// POST /api/video/generate - Generate video from image
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { imageUrl, model, motion, duration, segmentId, scriptText, visualDescription } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { error: 'Image URL is required' },
                { status: 400 }
            );
        }

        // Generate optimized video prompt from image analysis
        let videoPrompt = motion;
        let promptAnalysis = null;

        if (!motion || motion === 'auto') {
            console.log('Generating video prompt from image analysis...');
            try {
                const promptResult = await generateVideoPrompt({
                    imageUrl,
                    scriptText,
                    visualDescription,
                });

                videoPrompt = promptResult.prompt;
                promptAnalysis = {
                    imageAnalysis: promptResult.imageAnalysis,
                    suggestedMotion: promptResult.suggestedMotion,
                };

                console.log('Generated video prompt:', videoPrompt);
            } catch (promptError) {
                console.error('Prompt generation failed, using fallback:', promptError);
                videoPrompt = 'Static scene. Fixed camera. Subtle ambient motion. Cinematic atmosphere.';
            }
        }

        // Generate video with the optimized prompt
        const result = await generateVideo({
            imageUrl,
            model: (model as VideoModel) || 'hailuo',
            motion: videoPrompt,
            duration: duration || 5,
        });

        // If segmentId provided, update segment with video URL and generated prompt
        if (segmentId) {
            const supabase = createServerClient();
            const updateData: Record<string, unknown> = {
                video_url: result.videoUrl,
                duration_ms: result.durationMs,
            };

            // Store the generated prompt for reference (optional, if column exists)
            // updateData.video_prompt = videoPrompt;

            await supabase
                .from('segments')
                .update(updateData as never)
                .eq('id', segmentId);
        }

        return NextResponse.json({
            success: true,
            videoUrl: result.videoUrl,
            durationMs: result.durationMs,
            status: result.status,
            requestId: result.requestId,
            generatedPrompt: videoPrompt,
            promptAnalysis,
        });
    } catch (error) {
        console.error('Video generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate video' },
            { status: 500 }
        );
    }
}

// GET /api/video/generate?requestId=xxx&model=hailuo&segmentId=xxx - Check video status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('requestId');
        const segmentId = searchParams.get('segmentId');
        const model = (searchParams.get('model') as VideoModel) || 'hailuo';

        if (!requestId) {
            return NextResponse.json(
                { error: 'Request ID is required' },
                { status: 400 }
            );
        }

        console.log(`Checking video status for requestId: ${requestId}`);
        const result = await checkVideoStatus(requestId, model);
        console.log(`Status check result:`, JSON.stringify(result, null, 2));

        // If completed and segmentId provided, update DB
        if (result.status === 'completed' && result.videoUrl && segmentId) {
            console.log(`Updating segment ${segmentId} with video URL: ${result.videoUrl}`);
            const supabase = createServerClient();
            await supabase
                .from('segments')
                .update({
                    video_url: result.videoUrl,
                    duration_ms: result.durationMs || 6000,
                } as never)
                .eq('id', segmentId);
        }

        return NextResponse.json({
            success: true,
            videoUrl: result.videoUrl,
            durationMs: result.durationMs,
            status: result.status,
            requestId: result.requestId,
            debug: {
                rawStatus: result.status,
                hasVideoUrl: !!result.videoUrl,
            }
        });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json(
            { error: 'Failed to check status' },
            { status: 500 }
        );
    }
}

