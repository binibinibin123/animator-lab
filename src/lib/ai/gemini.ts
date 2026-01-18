// Gemini 3 Pro API for script generation

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface SegmentResult {
    text: string;
    visual?: string; // AI generated visual description
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
    // 3~5 seconds per segment for fast pacing
    const segmentCount = Math.ceil(durationSeconds / 5);

    const prompt = `
당신은 유튜브 영상 대본 작가 및 연출가입니다. 아래 주제에 대한 한국어 영상 대본과 장면 묘사를 작성해주세요.

주제: ${topic}
목표 길이: ${durationSeconds}초 (약 ${Math.round(durationSeconds / 60)}분)
스타일: ${style}
권장 세그먼트 수: 약 ${segmentCount}개 (3~5초 호흡)

요구사항:
1. **빠른 호흡**: 요즘 트렌드에 맞춰 3~5초마다 장면이 전환되도록 세그먼트를 잘게 나누세요.
2. **시각적 묘사 분리**: 대본(내레이션)과 달, AI 이미지 생성기가 이해할 수 있는 구체적인 시각적 묘사(영어 프롬프트 권장)를 별도로 작성하세요.
3. **자연스러운 연결**: 각 컷이 유기적으로 이어지도록 하세요.
4. **흥미 유발**: 초반 3초 안에 시청자를 사로잡는 강력한 후킹 멘트와 장면으로 시작하세요.

다음 JSON 형식으로 응답해주세요:
{
  "title": "영상 제목",
  "segments": [
    { 
      "text": "내레이션 대본 (한국어)...", 
      "visual": "Detailed visual description for Image Gen (English/Korean)...",
      "estimatedDurationMs": 4000 
    },
    { "text": "...", "visual": "...", "estimatedDurationMs": 3000 }
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
                    maxOutputTokens: 8192,
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
            (sum, seg) => sum + (seg.estimatedDurationMs || 3000), // Default 3000ms if missing
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
