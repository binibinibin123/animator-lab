import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export async function POST(request: Request) {
    try {
        const { debugText, segments } = await request.json();

        if (!segments || segments.length === 0) {
            return NextResponse.json({ error: 'No segments provided' }, { status: 400 });
        }

        console.log('[ShortsPlan] Analyzing segments count:', segments.length);

        // Prepare the script for AI analysis
        const scriptContent = segments.map((s: any, index: number) =>
            `[ID: ${s.id}] (Duration: ~${s.duration || 3}s)\nScript: ${s.script_text}\nVisual: ${s.image_prompt || 'N/A'}`
        ).join('\n\n');

        const prompt = `
You are an expert Video Editor specializing in viral Short-form content (TikTok/Reels/Shorts).
Your task is to repurpose a Long-form video into a HIGH-ENGAGEMENT Short-form video (30-60 seconds).

1. **SELECT SEGMENTS**:
   - **HOOK (0-3s)**: The most attention-grabbing segment. Must be shocking, surprising, or a strong question.
   - **RETENTION (Body)**: Segments that deliver the core value or story. Maintain high pacing.
   - **PAYOFF (Conclusion)**: A strong ending, takeaway, or curiosity loop.

2. **GENERATE TITLE**:
   - Create a **"Loss Aversion"** style title (Max 15 characters).
   - **CRITICAL**: The title MUST be in the SAME LANGUAGE as the Input Script.
     - If Script is English -> Output English Title (e.g., "You Will Regret Ignoring This").
     - If Script is Korean -> Output Korean Title (e.g., "이거 안 보면 100% 후회").
   - The title MUST be related to the SPECIFIC TOPIC of the video.
   - Do NOT use generic phrases alone. Combine topic + loss aversion.

**INPUT SCRIPT:**
${scriptContent}

**REQUIREMENTS:**
- Select a subset of Segment IDs.
- Total estimated duration should be between 30 and 60 seconds.
- STRICTLY return JSON.

**OUTPUT FORMAT (JSON ONLY):**
{
  "selectedSegmentIds": ["id_1", "id_5", "id_6"],
  "title": "안 보면 100% 후회",
  "reasoning": "Selected id_5 as the hook because..."
}
`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No text returned from Gemini');
        }

        let plan;
        try {
            plan = JSON.parse(generatedText);
        } catch (e) {
            console.error('JSON Parse Error:', generatedText);
            throw new Error('Failed to parse AI response');
        }

        return NextResponse.json(plan);

    } catch (error: any) {
        console.error('[ShortsPlan] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
