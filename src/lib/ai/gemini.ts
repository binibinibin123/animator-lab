// Gemini 3 Flash API for script generation

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

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

// Persona-specific system prompts
const PERSONA_PROMPTS: Record<string, string> = {
    finance: `You are a financial YouTube scriptwriter specializing in modern, data-driven economic commentary.

Your writing style should resemble popular no-fluff finance creators (e.g., Bob Invests-style):
- Calm, rational, slightly skeptical tone
- No hype, no emotional manipulation
- Focus on incentives, structure, and second-order effects
- Respect the viewer's intelligence

Core principles:
1. **HOOK MUST BE PROVOCATIVE**: Do NOT start with definitions like "AI is...". Start with a shocking fact, a direct challenge to the viewer, or a scary reality. (e.g., "Your retirement fund is bleeding, and you don't even know it.")
2. Clearly state what most people misunderstand about the topic.
3. Break the issue down into simple mental models, numbers, or mechanisms.
4. Use concrete examples (realistic scenarios, not vague metaphors).
5. Avoid motivational talk, clichés, or exaggerated promises.
6. End with a grounded takeaway or strategic question, not a dramatic conclusion.

Writing rules:
- Short, punchy sentences.
- Minimal adjectives.
- Prefer facts, logic, and cause-effect chains.
- Assume the audience is smart but busy.
- Do NOT use emojis, slang, or clickbait language.

Structure the script as:
1. **Killer Hook**: The first sentence MUST stop the scroll. No greetings. No "In this video...". Jump straight into the conflict.
2. Context (why this matters now)
3. Core analysis (step-by-step reasoning)
4. Implications (what changes because of this)
5. Practical takeaway (how to think, not what to blindly do)`,

    educator: `You are an educational content scriptwriter who excels at making complex topics accessible.

Your teaching style:
- Patient, encouraging, and clear
- Break complex ideas into digestible chunks
- Use analogies and relatable examples
- Build understanding step-by-step
- Anticipate and address common misconceptions

Core principles:
1. Start by connecting to what the viewer already knows.
2. Introduce new concepts gradually, one at a time.
3. Use visual metaphors that can be illustrated.
4. Repeat key points in slightly different ways.
5. End with a summary and encouragement to learn more.

Writing rules:
- Simple, clear sentences.
- Define jargon when first introduced.
- Use "we" to create a collaborative feeling.
- Ask rhetorical questions to engage viewers.
- Maintain an optimistic, supportive tone.`,

    storyteller: `You are a documentary-style scriptwriter who creates immersive narratives.

Your storytelling approach:
- Rich, evocative descriptions
- Strong emotional through-lines
- Character-driven perspectives when possible
- Building tension and resolution
- Thoughtful pacing with dramatic moments

Core principles:
1. Open with a compelling scene or moment.
2. Introduce stakes early - why should viewers care?
3. Weave facts into narrative structure.
4. Use sensory details for visual storytelling.
5. End with resonance - leave viewers thinking.

Writing rules:
- Varied sentence lengths for rhythm.
- Active voice and strong verbs.
- Show, don't just tell.
- Create moments of pause and reflection.
- Balance information with emotion.`,

    news: `You are a professional news scriptwriter delivering objective, factual content.

Your journalistic approach:
- Neutral, authoritative tone
- Lead with the most important information
- Cite sources and provide context
- Present multiple perspectives fairly
- Clear distinction between facts and analysis

Core principles:
1. Answer Who, What, When, Where, Why, How upfront.
2. Prioritize accuracy over entertainment.
3. Provide necessary background context.
4. Include relevant data and statistics.
5. End with implications or next steps to watch.

Writing rules:
- Concise, direct sentences.
- Avoid adjectives that imply judgment.
- Use precise language and specific numbers.
- Attribution for claims and quotes.
- Professional, measured delivery style.`,

    entertainer: `You are an entertainment content scriptwriter who makes learning fun.

Your entertaining approach:
- Energetic, playful tone
- Unexpected angles and surprising facts
- Light humor without being silly
- Pop culture references when relevant
- Fast-paced, engaging delivery

Core principles:
1. Hook with something unexpected or funny.
2. Keep the energy high throughout.
3. Make serious topics approachable.
4. Include memorable one-liners.
5. End on a high note with a callback or twist.

Writing rules:
- Punchy, dynamic sentences.
- Conversational, friendly tone.
- Strategic use of humor.
- Engaging rhetorical devices.
- Keep it moving - don't dwell too long on any point.`,
};

export async function generateScript(
    topic: string,
    durationSeconds: number,
    style: string = 'informative',
    language: string = 'ko',
    persona: string = 'finance',
    referenceSample?: string,
    isTestRun: boolean = false
): Promise<ScriptGenerationResult> {
    // If test run, force 6 seconds (enough for 1-2 segments)
    if (isTestRun) {
        durationSeconds = 6;
        console.log('[ScriptGen] Test Run detected: Duration forced to 6s');
    }

    // Revert to fixed 4s pacing as requested
    const calculatedPacing = 4;
    const segmentCount = Math.ceil(durationSeconds / calculatedPacing);

    console.log(`[ScriptGen] Duration: ${durationSeconds}s, Pacing: ${calculatedPacing}s, Target Segments: ${segmentCount}`);

    const personaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.finance;

    // Calculate target length based on language
    // English: ~150 words per minute (2.5 words/sec)
    // Korean: ~350 chars per minute (5.8 chars/sec)
    const targetWordCount = Math.round(durationSeconds * 2.5);
    const targetCharCount = Math.round(durationSeconds * 6.0);

    const lengthInstruction = language === 'ko'
        ? `Target Length: Approximately **${targetCharCount} characters** (excluding spaces).`
        : `Target Length: Approximately **${targetWordCount} words**.`;

    const languageInstruction = language === 'ko'
        ? 'IMPORTANT: You MUST write the entire script in KOREAN (한국어).'
        : 'IMPORTANT: You MUST write the entire script in ENGLISH.';

    // Tone Cloning Instruction
    let toneInstruction = '';
    if (referenceSample) {
        toneInstruction = `
TONE CLONING INSTRUCTION:
Review the following writing style sample from a previous script. 
You MUST clone this style (sentence length, vocabulary, attitude, ending pattern) EXACTLY.
Do not just copy the text, but copy the "Soul" of the writing.

[REFERENCE SAMPLE START]
${referenceSample.slice(0, 500)}...
[REFERENCE SAMPLE END]
`;
    }

    // Style-specific visual instructions
    let styleInstruction = '';
    if (style === 'economy-1') {
        styleInstruction = `
VISUAL INSTRUCTION:
The visual style is a specific corporate/economic cartoon.
ALL visual descriptions MUST focus on the main character: **'a simple white stickman character with a yellow box hat'**.
- Do NOT describe realistic people, detailed faces, or complex backgrounds.
- **NO TEXT**: Do NOT include text, letters, words, or charts with numbers in the visual.
- **VIDEO READY**: Keep the background simple and static (e.g., solid color or simple gradient) to allow for better video animation.
- Keep visuals abstract, symbolic, and clean.
- Example visuals: "The stickman character looking at a rising red arrow on a plain background", "The stickman holding a large gold coin", "A simple magnifying glass over a document".
`;
    } else if (style === 'senior-1') {
        styleInstruction = `
VISUAL INSTRUCTION:
The visual style is a **3D rendered simple stickman character**.
ALL visual descriptions MUST focus on the main character: **'a white 3D stickman with a fluffy white beard'**.
- **CHARACTER IDENTITY**: ALWAYS include "white stickman with a white beard".
- **STYLE**: Clean 3D render, soft lighting, minimalism.
- **BACKGROUND**: Pure white background or very simple abstract background.
- **NO TEXT**: Do NOT include text.
- Example visuals: "The bearded stickman holding a smartphone", "The bearded stickman standing next to a large medical cross symbol", "The bearded stickman looking thoughtful".
`;
    }

    const prompt = `
${personaPrompt}

${toneInstruction}

${styleInstruction}

Output format:
- Natural spoken language for voice-over
- No section headers in the final script
${languageInstruction}
- If the search results or topic are in a different language, TRANSLATE obtained information into ${language === 'ko' ? 'Korean' : 'English'} for the script.

CRITICAL RULES FOR PACING AND LENGTH (Follow strictly):
1. **MEET THE TARGET LENGTH**: The script MUST be long enough to cover ${durationSeconds} seconds. 
   - ${lengthInstruction}
   - Do NOT write a short summary. Write a FULL script.
2. **KILLER HOOK**: The FIRST segment MUST be a specific, provocative statement. 
   - BAD: "Artificial Intelligence is very convenient."
   - GOOD: "Half of your electricity bill might be paying for ChatGPT's server costs."
3. **EXTREME BREVITY**: Each segment MUST be very short. Max 15 words (English) or 40 characters (Korean).
4. **SPLIT SENTENCES**: If a sentence is long, SPLIT it into multiple segments.
   - Bad: "The economy is crashing because interest rates are rising." (1 segment)
   - Good: "The economy is crashing." (Segment 1) + "Why? Because interest rates are rising." (Segment 2)
5. **VISUAL VARIETY**: Every segment needs a NEW visual description. Do not repeat the same visual for consecutive segments.
6. **LOGICAL FLOW**: Ensure smooth transitions between cuts.

---

Topic: ${topic}
Target Duration: ${durationSeconds} seconds (approximately ${Math.round(durationSeconds / 60)} minutes)
Recommended segments: ~${segmentCount} cuts (3~5 seconds each)
${lengthInstruction}

Additional requirements:
1. **Visual descriptions**: For each segment, provide a detailed visual description in English for AI image generation. (e.g., "Close-up of a stock chart with red arrows pointing down")
2. **Segment pacing**: Keep each segment 3~5 seconds for fast-paced editing.
3. **Logical flow**: Ensure smooth transitions between cuts.

Respond in JSON format:
{
  "title": "Video title${language === 'ko' ? ' (in Korean)' : ''}",
  "segments": [
    { 
      "text": "Short narration script...", 
      "visual": "Detailed visual description for AI Image Gen (English)...",
      "estimatedDurationMs": 4000 
    },
    { "text": "...", "visual": "...", "estimatedDurationMs": 3000 }
  ]
}
`;

    try {
        console.log('[ScriptGen] Sending request to Gemini...');
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
                    responseMimeType: 'application/json',
                },
                tools: [
                    { googleSearch: {} }
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ScriptGen] Gemini API Error: ${response.status} `, errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText} `);
        }

        const data = await response.json();
        console.log('[ScriptGen] Received response from Gemini');
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('[ScriptGen] No text in response:', JSON.stringify(data));
            throw new Error('No text returned from Gemini');
        }

        // Try direct parsing first
        try {
            const result = JSON.parse(text) as ScriptGenerationResult;
            result.totalDurationMs = result.segments.reduce(
                (sum, seg) => sum + (seg.estimatedDurationMs || 3000),
                0
            );
            return result;
        } catch (e) {
            console.warn('[ScriptGen] Direct JSON parse failed, attempting repair...');

            // Repair Strategy: Extract all segment objects using Regex
            const segmentRegex = /{\s*"text"[\s\S]*?"estimatedDurationMs"[\s\S]*?}/g;
            const matches = text.match(segmentRegex);

            if (!matches || matches.length === 0) {
                console.error('[ScriptGen] No valid segments found in truncated text:', text);
                throw new Error('Failed to parse or repair JSON from Gemini response');
            }

            const segments: SegmentResult[] = [];
            for (const match of matches) {
                try {
                    const seg = JSON.parse(match);
                    if (seg.text && seg.estimatedDurationMs) {
                        segments.push(seg);
                    }
                } catch (err) {
                    continue; // Skip malformed segments
                }
            }

            if (segments.length === 0) {
                throw new Error('No valid segments recovered');
            }

            // Extract title if possible
            const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : 'Generated Video';

            const result: ScriptGenerationResult = {
                title,
                segments,
                totalDurationMs: segments.reduce((sum, s) => sum + (s.estimatedDurationMs || 3000), 0)
            };

            console.log(`[ScriptGen] Repaired JSON: Recovered ${segments.length} segments`);
            return result;
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

export async function generateTopic(channelDescription: string): Promise<string> {
    const prompt = `
Generate a single, provocative, short video topic based on this channel description:
"${channelDescription}"

The topic should be surprising, specific, and suitable for a 1-minute YouTube Short.
Output ONLY the topic text. No quotes, no intro.
Language: Korean.
`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'AI News';
    } catch (e) {
        console.error('Generate Topic Error:', e);
        return 'AI Issue';
    }
}

// Generic text generation for any prompt
export async function generateRawText(prompt: string): Promise<string> {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (error) {
        console.error('GenerateText Error:', error);
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
