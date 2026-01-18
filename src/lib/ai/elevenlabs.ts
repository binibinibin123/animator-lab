// ElevenLabs API for TTS generation

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface Voice {
    voice_id: string;
    name: string;
    category: string;
}

export interface TTSResult {
    audioBuffer: Buffer;
    durationMs: number;
}

// Default Korean-compatible voices
export const DEFAULT_VOICES = [
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female' },
];

export async function generateTTS(
    text: string,
    voiceId: string = DEFAULT_VOICES[0].id
): Promise<TTSResult> {
    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        // Estimate duration based on text length (approximately 150 words per minute)
        const wordCount = text.split(/\s+/).length;
        const estimatedDurationMs = Math.round((wordCount / 150) * 60 * 1000);

        return {
            audioBuffer,
            durationMs: estimatedDurationMs,
        };
    } catch (error) {
        console.error('ElevenLabs API error:', error);
        throw error;
    }
}

export async function getAvailableVoices(): Promise<Voice[]> {
    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const data = await response.json();
        return data.voices;
    } catch (error) {
        console.error('Failed to fetch voices:', error);
        return [];
    }
}

export async function testElevenLabsConnection(): Promise<boolean> {
    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
            headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        });
        return response.ok;
    } catch {
        return false;
    }
}
