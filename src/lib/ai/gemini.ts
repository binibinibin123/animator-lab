// Gemini 3 Pro API for script generation

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface SegmentResult {
    text: string;
    estimatedDurationMs: number;
}

interface ScriptGenerationResult {
    title: string;
    segments: SegmentResult[];
    totalDurationMs: number;
}

export async function generateScript(
    topic: string,
    durationSeconds: number,
    style: string = 'informative'
): Promise<ScriptGenerationResult> {
    const segmentCount = Math.ceil(durationSeconds / 15); // ~15 seconds per segment

    const prompt = `
당신은 유튜브 영상 대본 작가입니다. 아래 주제에 대한 한국어 영상 대본을 작성해주세요.

주제: ${topic}
목표 길이: ${durationSeconds}초 (약 ${Math.round(durationSeconds / 60)}분)
스타일: ${style}
세그먼트 수: ${segmentCount}개

요구사항:
1. 각 세그먼트는 약 15초 분량 (약 40-50단어)
2. 자연스러운 흐름과 전환
3. 시청자 관심을 끄는 인트로
4. 명확한 결론

다음 JSON 형식으로 응답해주세요:
{
  "title": "영상 제목",
  "segments": [
    { "text": "세그먼트 1 대본...", "estimatedDurationMs": 15000 },
    { "text": "세그먼트 2 대본...", "estimatedDurationMs": 15000 }
  ]
}
`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 4096,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse JSON from Gemini response');
        }

        const result = JSON.parse(jsonMatch[0]) as ScriptGenerationResult;

        // Calculate total duration
        result.totalDurationMs = result.segments.reduce(
            (sum, seg) => sum + seg.estimatedDurationMs,
            0
        );

        return result;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

// Simple test function
export async function testGeminiConnection(): Promise<boolean> {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello' }] }],
            }),
        });
        return response.ok;
    } catch {
        return false;
    }
}
