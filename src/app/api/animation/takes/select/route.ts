import { NextRequest, NextResponse } from 'next/server';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { createServerClient } from '@/lib/supabase';
import {
    buildTakeSelectionUpdates,
    type AnimationMediaType,
} from '@/lib/animation/storyboard';

const MEDIA_TYPES: AnimationMediaType[] = ['image', 'video', 'audio'];

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

function parseMediaType(value: unknown): AnimationMediaType | null {
    return typeof value === 'string' && (MEDIA_TYPES as string[]).includes(value)
        ? value as AnimationMediaType
        : null;
}

export async function POST(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const body = await request.json().catch(() => ({}));
    const takeId = typeof body.takeId === 'string' ? body.takeId.trim() : '';
    const segmentId = typeof body.segmentId === 'string' ? body.segmentId.trim() : '';
    const assetUrl = typeof body.assetUrl === 'string' ? body.assetUrl.trim() : '';
    const mediaType = parseMediaType(body.mediaType);

    if (!takeId || !segmentId || !assetUrl || !mediaType) {
        return errorResponse(400, 'INVALID_INPUT', 'takeId, segmentId, mediaType, and assetUrl are required');
    }

    const updates = buildTakeSelectionUpdates({
        takeId,
        segmentId,
        mediaType,
        assetUrl,
    });

    const supabase = createServerClient();

    const { error: clearError } = await supabase
        .from('generation_takes')
        .update(updates.otherTakesPatch as never)
        .eq('segment_id', segmentId)
        .eq('media_type', mediaType);

    if (clearError) {
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to clear selected takes', clearError.message);
    }

    const { error: selectError } = await supabase
        .from('generation_takes')
        .update(updates.selectedTakePatch as never)
        .eq('id', takeId)
        .eq('segment_id', segmentId);

    if (selectError) {
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to select take', selectError.message);
    }

    const { error: segmentError } = await supabase
        .from('segments')
        .update(updates.segmentPatch as never)
        .eq('id', segmentId);

    if (segmentError) {
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to sync selected take to segment', segmentError.message);
    }

    return NextResponse.json({
        success: true,
        takeId,
        segmentId,
        mediaType,
        assetUrl,
        segmentPatch: updates.segmentPatch,
    });
}
