// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateTTS, DEFAULT_VOICES } from '@/lib/ai/elevenlabs';

// POST /api/tts - Generate TTS audio
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voiceId, segmentId } = body;

        console.log('[API /tts] Request:', {
            textLength: text?.length,
            voiceId,
            segmentId
        });

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        if (!voiceId) {
            return NextResponse.json(
                { error: 'Voice ID is required' },
                { status: 400 }
            );
        }

        // Generate TTS
        console.log('[API /tts] Generating audio...');
        const result = await generateTTS(text, voiceId);
        console.log('[API /tts] Audio generated, size:', result.audioBuffer.length);

        // Upload audio to Supabase Storage
        const supabase = createServerClient();
        const fileName = `audio_${Date.now()}.mp3`;

        console.log('[API /tts] Uploading to Supabase:', fileName);

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('autovideo-media')
            .upload(`audio/${fileName}`, result.audioBuffer, {
                contentType: 'audio/mpeg',
            });

        if (uploadError) {
            console.error('[API /tts] Supabase upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('autovideo-media')
            .getPublicUrl(`audio/${fileName}`);

        const audioUrl = urlData.publicUrl;
        console.log('[API /tts] Audio URL:', audioUrl);

        // If segmentId provided, update segment
        if (segmentId) {
            console.log('[API /tts] Updating segment:', segmentId);
            const { error: updateError } = await supabase
                .from('segments')
                .update({ audio_url: audioUrl, duration_ms: result.durationMs })
                .eq('id', segmentId);

            if (updateError) {
                console.error('[API /tts] Segment update error:', updateError);
            }
        }

        return NextResponse.json({
            success: true,
            audioUrl,
            durationMs: result.durationMs,
        });
    } catch (error: any) {
        console.error('[API /tts] Error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to generate TTS', details: error?.message },
            { status: 500 }
        );
    }
}
