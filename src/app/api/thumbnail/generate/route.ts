import { NextRequest, NextResponse } from 'next/server';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { createServerClient } from '@/lib/supabase';
import { generateImage } from '@/lib/ai/nanobanana';
import { generateRawText } from '@/lib/ai/gemini';
import { ResolverError, resolveReferenceContext } from '@/lib/image/referenceResolver';
import { getDefaultImageModelId } from '@/lib/models/registry';

function errorResponse(status: number, code: string, message: string, details?: unknown) {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                ...(details !== undefined ? { details } : {}),
            },
        },
        { status }
    );
}

export async function POST(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    try {
        const body = await request.json();
        const { projectId, scriptText, style, styleText } = body;

        if (!projectId) {
            return errorResponse(400, 'INVALID_INPUT', 'projectId is required');
        }

        if (!scriptText || typeof scriptText !== 'string') {
            return errorResponse(400, 'INVALID_INPUT', 'scriptText is required');
        }

        const resolved = await resolveReferenceContext({
            projectId,
            styleOverride: style,
            styleTextOverride: styleText,
        });
        resolved.warnings.forEach((warning) => {
            console.warn(warning);
        });

        const koreanCharCount = (scriptText.match(/[가-힣]/g) || []).length;
        const totalCharCount = scriptText.length;
        const isKorean = totalCharCount > 0 ? (koreanCharCount / totalCharCount) > 0.1 : false;
        const targetLang = isKorean ? 'Korean' : 'English';

        const planningPrompt = `
            You are a YouTube Thumbnail Artist expert in High-CTR.

            TASK: Plan a viral thumbnail for the script below.
            LANGUAGE: ${targetLang} (The specific text overlay must be in this language).

            SCRIPT:
            ${scriptText.slice(0, 500)}...

            REQUIREMENTS:
            1. Analyze the Script and pick strongest emotional hook.
            2. Visual: dramatic and relevant scene description.
            3. Text: EXACTLY ONE short phrase (max 3 words).
            4. Mood: define mood clearly.

            OUTPUT FORMAT (JSON ONLY):
            {
                "visual_prompt": "description...",
                "text_overlay": "KEYWORD",
                "mood": "Intense"
            }
        `;

        const rawPlan = await generateRawText(planningPrompt);

        let visualPrompt = 'A dramatic YouTube thumbnail.';
        let textOverlay = '';
        let mood = 'Dramatic';

        try {
            const cleanJson = rawPlan.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(cleanJson);
            visualPrompt = plan.visual_prompt || visualPrompt;
            mood = plan.mood || mood;
            textOverlay = (plan.text_overlay || '')
                .replace(/^\d+\.\s*/, '')
                .replace(/^-\s*/, '')
                .replace(/"/g, '')
                .trim();
            if (textOverlay.includes('\n')) {
                textOverlay = textOverlay.split('\n')[0].trim();
            }
        } catch (parseError) {
            console.error('[Thumbnail API] Failed to parse plan JSON:', parseError);
            visualPrompt = rawPlan;
        }

        let referenceInstruction = '';
        if (resolved.referenceIntent === 'character') {
            referenceInstruction = '- CHARACTER: Keep the same character identity from the reference image.';
        } else if (resolved.referenceIntent === 'style') {
            referenceInstruction = '- STYLE REFERENCE: Preserve the visual style from the reference image; character identity may vary.';
        }

        const finalImagePrompt = `
            YouTube Thumbnail. ${visualPrompt}

            Text: "${textOverlay}"

            STYLE INSTRUCTIONS:
            - COMPOSITION: Cinematic 8k render, rule of thirds.
            - TEXT: The text "${textOverlay}" should be visible in the scene.
            - MOOD: ${mood}, dramatic lighting.
            ${referenceInstruction}
        `.trim();

        const result = await generateImage({
            prompt: finalImagePrompt,
            style: resolved.effectiveStylePreset,
            styleText: resolved.effectiveStyleText,
            aspectRatio: '16:9',
            resolution: 'medium',
            referenceImage: resolved.referenceImage || undefined,
            referenceMimeType: resolved.referenceMimeType || 'image/png',
            referenceIntent: resolved.referenceIntent,
            modelId: getDefaultImageModelId(),
        });

        const supabase = createServerClient();
        const { error } = await supabase
            .from('projects')
            .update({ thumbnail_url: result.imageUrl } as never)
            .eq('id', projectId);

        if (error) {
            return errorResponse(500, 'INTERNAL_ERROR', 'Failed to save thumbnail URL', error.message);
        }

        return NextResponse.json({
            success: true,
            imageUrl: result.imageUrl,
            warnings: resolved.warnings,
        });
    } catch (error: any) {
        if (error instanceof ResolverError) {
            return errorResponse(error.status, error.code, error.message, error.details);
        }

        console.error('[Thumbnail API] Error:', error);
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to generate thumbnail', error.message);
    }
}
