// ElevenLabs API for TTS generation
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

export interface Voice {
    voiceId: string;
    name: string;
    category: string;
    previewUrl?: string;
}

export interface TTSResult {
    audioBuffer: Buffer;
    durationMs: number;
}

// Default Korean-compatible voices (fallback)
export const DEFAULT_VOICES: Voice[] = [
    { voiceId: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/38a69695-2ca9-4b9e-b9ec-f07ced494f2a.mp3' },
    { voiceId: 'ErXwobaYiN019PkySvjV', name: 'Antoni', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/057bc99a-855a-4b04-907d-c4c4ca710c91.mp3' },
    { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/10fdce5d-0b63-4119-9b18-c61e7a296e74.mp3' },
    { voiceId: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/MF3mGyEYCl7XYWbV9V6O/e6e63eab-da88-4b3e-9ef8-cf5aa9a73fbe.mp3' },
];

export async function generateTTS(
    text: string,
    voiceId: string = DEFAULT_VOICES[0].voiceId
): Promise<TTSResult> {
    try {
        console.log('[ElevenLabs] Generating TTS for voice:', voiceId);

        const audioStream = await client.textToSpeech.convert(voiceId, {
            text,
            modelId: 'eleven_multilingual_v2',
        });

        const chunks: Uint8Array[] = [];
        for await (const chunk of audioStream as any) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        console.log('[ElevenLabs] Generated audio buffer size:', audioBuffer.length);

        const charCount = text.length;
        const estimatedDurationMs = Math.round((charCount / 3) * 1000);

        return {
            audioBuffer,
            durationMs: estimatedDurationMs,
        };
    } catch (error: any) {
        console.error('[ElevenLabs] SDK error:', error?.message || error);
        throw error;
    }
}

export async function getAvailableVoices(): Promise<Voice[]> {
    try {
        console.log('[ElevenLabs] Fetching voices...');
        const response = await client.voices.getAll();

        const voices = response.voices.map((v) => ({
            voiceId: v.voiceId,
            name: v.name || 'Unknown',
            category: v.category || 'generated',
            previewUrl: v.previewUrl || undefined,
        }));

        console.log('[ElevenLabs] Fetched', voices.length, 'voices');
        console.log('[ElevenLabs] First voice:', voices[0]);
        return voices;
    } catch (error: any) {
        console.warn('[ElevenLabs] Failed to fetch voices, using defaults:', error?.message);
        return DEFAULT_VOICES;
    }
}

export async function testElevenLabsConnection(): Promise<boolean> {
    try {
        await client.user.get();
        return true;
    } catch (error: any) {
        if (error?.body?.detail?.status === 'missing_permissions') {
            console.log('[ElevenLabs] Key is valid but restricted');
            return true;
        }
        return false;
    }
}
