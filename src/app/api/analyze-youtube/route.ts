import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
            return NextResponse.json(
                { error: 'Invalid YouTube URL' },
                { status: 400 }
            );
        }

        console.log('[Analyze] Fetching YouTube page:', url);

        // 1. Fetch Page HTML (User-Agent mimicking browser to avoid some bot detection)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status}`);
        }

        const html = await response.text();

        // 2. Extract Metadata (Basic Regex)
        const getMeta = (name: string) => {
            const regex = new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`, 'i');
            const match = html.match(regex);
            return match ? match[1] : '';
        };

        const title = getMeta('og:title') || html.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const description = getMeta('og:description') || getMeta('description') || '';
        const keywords = getMeta('keywords') || '';

        console.log('[Analyze] Extracted metadata:', { title, description: description.substring(0, 50) + '...' });

        // 3. Ask Gemini to Analyze
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `
        You are an expert content strategist. I will provide metadata from a YouTube video.
        Your task is to reverse-engineer the "Persona" and "Style" of this channel so we can clone its vibe.
        
        Video Title: ${title}
        Video Description: ${description}
        Keywords: ${keywords}
        
        Based on this, return a JSON object with the following fields:
        1. "name": A catchy channel name (if the video title implies a series, use that, otherwise suggest a name fitting the vibe).
        2. "description": A detailed, instruction-like description for an AI to generate similar content (e.g. "Create 1-minute explanatory videos about tech in a sarcastic tone...").
        3. "style_preset": Choose exactly one closest match from: ['economy-1', 'senior-1', 'anime', 'realistic', '3d-render'].
           - economy-1: Simple stickman, fast, funny.
           - senior-1: High quality stickman, educational.
           - anime: Japanese anime style.
           - realistic: Real photos/video style.
           - 3d-render: 3D graphics.
        4. "voice_gender": 'male' or 'female'. Infer from the content or description who the host likely is.

        Output only valid JSON.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean JSON formatting (remove markdown code blocks if any)
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error('[Analyze] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze video' },
            { status: 500 }
        );
    }
}
