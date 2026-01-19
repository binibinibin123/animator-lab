// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateTTS, DEFAULT_VOICES } from '@/lib/ai/elevenlabs';

// POST /api/tts - Generate TTS audio
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voiceId, segmentId } = body;

        console.log('[API /tts] Request:', { textLength: text?.length, voiceId, segmentId });

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (!voiceId) {
            return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
        }

        // Generate TTS
        console.log('[API /tts] Generating audio...');
        const result = await generateTTS(text, voiceId);
        console.log('[API /tts] Audio generated, size:', result.audioBuffer.length);

        // Supabase 디버깅
        const supabase = createServerClient();
        console.log('[API /tts] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('[API /tts] Service Key set:', !!process.env.SUPABASE_SERVICE_KEY);

        // 버킷 목록 확인
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        console.log('[API /tts] Available buckets:', buckets?.map(b => b.name));
        if (bucketsError) {
            console.error('[API /tts] Buckets list error:', bucketsError);
        }

        const fileName = `audio_${Date.now()}.mp3`;
        console.log('[API /tts] Uploading to bucket: autovideo-media, file:', fileName);

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('autovideo-media')
            .upload(`audio/${fileName}`, result.audioBuffer, {
                contentType: 'audio/mpeg',
            });

        if (uploadError) {
            console.error('[API /tts] Upload error:', uploadError);
            console.error('[API /tts] Upload error details:', JSON.stringify(uploadError));
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('autovideo-media')
            .getPublicUrl(`audio/${fileName}`);

        const audioUrl = urlData.publicUrl;
        console.log('[API /tts] Audio URL:', audioUrl);

        // Update segment if provided
        if (segmentId) {
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
