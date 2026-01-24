import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateImage } from '@/lib/ai/nanobanana';
import { generateRawText } from '@/lib/ai/gemini';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, scriptText, style = 'anime' } = body;

        console.log('[Thumbnail API] Generating thumbnail for:', projectId);

        // 1. Language Detection
        const koreanCharCount = (scriptText.match(/[가-힣]/g) || []).length;
        const totalCharCount = scriptText.length;
        const isKorean = (koreanCharCount / totalCharCount) > 0.1;
        const targetLang = isKorean ? 'Korean' : 'English';

        console.log(`[Thumbnail API] Language: ${targetLang}`);

        // 2. Step 1: LLM Visual Planning (Loss Aversion)
        const planningPrompt = `
            You are a YouTube Thumbnail Artist expert in High-CTR and "Loss Aversion" psychology.
            
            TASK: Plan a viral thumbnail for the script below.
            LANGUAGE: ${targetLang} (The specific text overlay must be in this language).
            
            SCRIPT:
            ${scriptText.slice(0, 500)}...
            
            REQUIREMENTS:
            1. **Theme**: Loss Aversion (Shock, Fear, Mistake).
            2. **Visual**: A dramatic scene description.
            3. **Text**: EXACTLY ONE short phrase (max 3 words). DO NOT provide a list. Just the best one.
            
            OUTPUT FORMAT (JSON ONLY):
            {
                "visual_prompt": "description...",
                "text_overlay": "STOP"
            }
        `;

        const rawPlan = await generateRawText(planningPrompt);
        console.log('[Thumbnail API] Raw Plan:', rawPlan);

        let visualPrompt = "A dramatic YouTube thumbnail.";
        let textOverlay = "";

        try {
            const cleanJson = rawPlan.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(cleanJson);
            visualPrompt = plan.visual_prompt;

            // Critical Sanitization: Remove "1.", bullets, or extra quotes
            textOverlay = plan.text_overlay.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').replace(/"/g, '').trim();

            // Fallback: If it still looks like a list (newlines), take the first line
            if (textOverlay.includes('\n')) {
                textOverlay = textOverlay.split('\n')[0].trim();
            }

        } catch (e) {
            console.error('Failed to parse thumbnail plan, using raw text', e);
            visualPrompt = rawPlan;
        }

        console.log('[Thumbnail API] Text Final:', textOverlay);

        // 3. Prepare Reference Image (existing code...)
        // ... (Keep existing reference loading logic) ...
        let referenceImage: string | undefined;
        let referenceMimeType = 'image/png';

        if (style && style !== 'custom') {
            const extensions = ['png', 'jpg', 'jpeg'];
            for (const ext of extensions) {
                const stylePath = path.join(process.cwd(), 'public', 'styles', `${style}.${ext}`);
                if (fs.existsSync(stylePath)) {
                    const buffer = fs.readFileSync(stylePath);
                    referenceImage = buffer.toString('base64');
                    referenceMimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                    break;
                }
            }
        }

        // 4. Step 2: Image Generation
        const finalImagePrompt = `
            YouTube Thumbnail. ${visualPrompt}
            
            Text: "${textOverlay}"
            
            STYLE INSTRUCTIONS:
            - **COMPOSITION**: Cinematic 8k render, rule of thirds.
            - **TEXT**: The text "${textOverlay}" should be visible in the scene.
            - **CHARACTER**: Use the exact character from the reference image, redrawn in the scene.
            - **MOOD**: High stakes, loss aversion, dramatic lighting.
        `.trim();

        const result = await generateImage({
            prompt: finalImagePrompt,
            style: style,
            aspectRatio: '16:9',
            resolution: '2K',
            referenceImage,
            referenceMimeType
        });

        // 5. Save to DB
        const supabase = createServerClient();
        const { error } = await supabase
            .from('projects')
            .update({ thumbnail_url: result.imageUrl } as any)
            .eq('id', projectId);

        if (error) console.error('[Thumbnail API] DB Update Error:', error);

        return NextResponse.json({
            success: true,
            imageUrl: result.imageUrl
        });

    } catch (error: any) {
        console.error('[Thumbnail API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
