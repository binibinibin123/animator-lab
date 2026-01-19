// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateTTS, DEFAULT_VOICES } from '@/lib/ai/elevenlabs';

// POST /api/tts/generate - Generate TTS audio
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voiceId, segmentId } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        // Generate TTS
        const voice = voiceId || DEFAULT_VOICES[0].id;
        const result = await generateTTS(text, voice);

        // Upload audio to Supabase Storage
        const supabase = createServerClient();
        const fileName = `audio_${Date.now()}.mp3`;

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('autovideo-media')
            .upload(`audio/${fileName}`, result.audioBuffer, {
                contentType: 'audio/mpeg',
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('autovideo-media')
            .getPublicUrl(`audio/${fileName}`);

        const audioUrl = urlData.publicUrl;

        // If segmentId provided, update segment
        if (segmentId) {
            await supabase
                .from('segments')
                .update({ audio_url: audioUrl, duration_ms: result.durationMs })
                .eq('id', segmentId);
        }

        return NextResponse.json({
            success: true,
            audioUrl,
            durationMs: result.durationMs,
        });
    } catch (error) {
        console.error('TTS generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate TTS' },
            { status: 500 }
        );
    }
}

// GET /api/tts/generate - Get available voices
export async function GET() {
    return NextResponse.json({
        voices: DEFAULT_VOICES,
    });
}
