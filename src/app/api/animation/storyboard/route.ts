import { NextRequest, NextResponse } from 'next/server';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { createServerClient } from '@/lib/supabase';
import { buildStoryBible } from '@/lib/animation/storyboard';

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

function isSchemaMissingColumnError(error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    return message.includes('schema cache') && message.includes('Could not find the');
}

export async function POST(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const body = await request.json().catch(() => ({}));
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';

    if (!projectId) {
        return errorResponse(400, 'INVALID_INPUT', 'projectId is required');
    }

    const storyBible = buildStoryBible({
        ...(body.storyBible || {}),
        topic: body.topic,
    });

    const supabase = createServerClient();
    let schemaMode: 'current' | 'legacy' = 'current';
    const { error: projectError } = await supabase
        .from('projects')
        .update({
            story_bible: storyBible,
            production_mode: 'animation',
        } as never)
        .eq('id', projectId);

    if (projectError) {
        if (!isSchemaMissingColumnError(projectError)) {
            return errorResponse(500, 'INTERNAL_ERROR', 'Failed to save story bible', projectError.message);
        }
        schemaMode = 'legacy';
    }

    const shots = Array.isArray(body.shots) ? body.shots : [];
    let updatedShots = 0;

    for (const shot of shots) {
        if (!shot || typeof shot !== 'object') {
            continue;
        }

        const patch = {
            script_text: typeof shot.scriptText === 'string' ? shot.scriptText : shot.script_text,
            visual_description: typeof shot.visualDescription === 'string' ? shot.visualDescription : shot.visual_description,
            camera_work: shot.cameraWork ?? shot.camera_work ?? null,
            action_notes: shot.actionNotes ?? shot.action_notes ?? null,
            lighting_notes: shot.lightingNotes ?? shot.lighting_notes ?? null,
            emotion_notes: shot.emotionNotes ?? shot.emotion_notes ?? null,
            negative_prompt: shot.negativePrompt ?? shot.negative_prompt ?? storyBible.negativeRules,
            duration_ms: typeof shot.durationMs === 'number' ? shot.durationMs : shot.duration_ms,
            review_status: shot.reviewStatus ?? shot.review_status ?? 'draft',
        };

        const segmentId = typeof shot.id === 'string' ? shot.id : '';
        if (segmentId) {
            let { error } = await supabase
                .from('segments')
                .update(patch as never)
                .eq('id', segmentId)
                .eq('project_id', projectId);

            if (error && isSchemaMissingColumnError(error)) {
                schemaMode = 'legacy';
                const retry = await supabase
                    .from('segments')
                    .update({
                        script_text: patch.script_text || '',
                        visual_description: patch.visual_description || null,
                        duration_ms: patch.duration_ms || null,
                    } as never)
                    .eq('id', segmentId)
                    .eq('project_id', projectId);
                error = retry.error;
            }

            if (!error) {
                updatedShots++;
            }
            continue;
        }

        const orderIndex = Number.isFinite(Number(shot.orderIndex ?? shot.order_index))
            ? Number(shot.orderIndex ?? shot.order_index)
            : updatedShots;

        let { error } = await supabase
            .from('segments')
            .insert({
                project_id: projectId,
                order_index: orderIndex,
                script_text: patch.script_text || '',
                visual_description: patch.visual_description || null,
                camera_work: patch.camera_work,
                action_notes: patch.action_notes,
                lighting_notes: patch.lighting_notes,
                emotion_notes: patch.emotion_notes,
                negative_prompt: patch.negative_prompt,
                duration_ms: patch.duration_ms || null,
                review_status: patch.review_status,
            } as never);

        if (error && isSchemaMissingColumnError(error)) {
            schemaMode = 'legacy';
            const retry = await supabase
                .from('segments')
                .insert({
                    project_id: projectId,
                    order_index: orderIndex,
                    script_text: patch.script_text || '',
                    visual_description: patch.visual_description || null,
                    duration_ms: patch.duration_ms || null,
                } as never);
            error = retry.error;
        }

        if (!error) {
            updatedShots++;
        }
    }

    return NextResponse.json({
        success: true,
        projectId,
        storyBible,
        updatedShots,
        schemaMode,
    });
}
