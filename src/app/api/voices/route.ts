// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getAvailableVoices, DEFAULT_VOICES } from '@/lib/ai/elevenlabs';

// GET /api/voices - Get available voices from ElevenLabs
export async function GET() {
    try {
        console.log('[API /voices] Fetching voices...');
        const voices = await getAvailableVoices();
        console.log('[API /voices] Returning', voices.length, 'voices');
        return NextResponse.json({ voices });
    } catch (error: any) {
        console.error('[API /voices] Error:', error?.message);
        return NextResponse.json({ voices: DEFAULT_VOICES });
    }
}
