
import { NextRequest, NextResponse } from 'next/server';
import { generateRawText } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, scriptText } = body;

        console.log('[Metadata API] Generating metadata for project:', projectId);

        if (!projectId || !scriptText) {
            return NextResponse.json({ error: 'Missing projectId or scriptText' }, { status: 400 });
        }

        // 1. Language Detection (Strict)
        const koreanCharCount = (scriptText.match(/[가-힣]/g) || []).length;
        const totalCharCount = scriptText.length;
        const isKorean = (koreanCharCount / totalCharCount) > 0.1; // >10% Korean chars
        const targetLang = isKorean ? 'Korean (한국어)' : 'English';

        console.log(`[Metadata API] Detected Language: ${targetLang} (Korean chars: ${koreanCharCount}/${totalCharCount})`);

        // 2. System Prompt with "Loss Aversion" + "Language Enforcement"
        const prompt = `
            You are a YouTube Marketing Expert specializing in "Loss Aversion" psychology.
            Analyze the following video script and generate viral metadata.

            CRITICAL INSTRUCTION:
            - **OUTPUT MUST BE IN ${targetLang.toUpperCase()} ONLY.**
            - If the script is Korean, the Titles and Description MUST be Korean.
            - If the script is English, the Titles and Description MUST be English.
            - Do NOT translate unless the target language is different from the input.

            STRATEGY (Loss Aversion):
            - Focus on what the viewer LOSES by not watching (FOMO).
            - Use negative framing (e.g., "Why you are failing...", "Don't do this...").
            - ${isKorean ? 'Use Korean YouTube trends (e.g., "충격", "이유", "결국").' : 'Use uppercase for key words.'}

            INPUT SCRIPT:
            ${scriptText.slice(0, 1000)}...

            OUTPUT FORMAT (JSON only):
            {
                "titles": [
                    "Provocative Title 1",
                    "Provocative Title 2",
                    "Provocative Title 3..."
                ],
                "description": "2-3 sentences of hook-heavy description followed by hashtags.",
                "tags": "comma, separated, tags, max, 10"
            }
        `;

        const jsonStr = await generateRawText(prompt);
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const metadata = JSON.parse(cleanJson);

        return NextResponse.json({ metadata });

    } catch (error: any) {
        console.error('[Metadata API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
