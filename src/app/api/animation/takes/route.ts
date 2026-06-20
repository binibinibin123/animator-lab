import { NextRequest, NextResponse } from 'next/server';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { createServerClient } from '@/lib/supabase';
import type { AnimationMediaType } from '@/lib/animation/storyboard';

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

export async function GET(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');
    const projectId = searchParams.get('projectId');

    if (!segmentId && !projectId) {
        return errorResponse(400, 'INVALID_INPUT', 'segmentId or projectId is required');
    }

    const supabase = createServerClient();
    let query = supabase
        .from('generation_takes')
        .select('*')
        .order('created_at', { ascending: false });

    if (segmentId) {
        query = query.eq('segment_id', segmentId);
    }

    if (projectId) {
        query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to load generation takes', error.message);
    }

    return NextResponse.json({ takes: data || [] });
}

export async function POST(request: NextRequest) {
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const body = await request.json().catch(() => ({}));
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    const segmentId = typeof body.segmentId === 'string' ? body.segmentId.trim() : '';
    const mediaType = parseMediaType(body.mediaType);

    if (!projectId || !segmentId || !mediaType) {
        return errorResponse(400, 'INVALID_INPUT', 'projectId, segmentId, and mediaType are required');
    }

    const assetUrl = typeof body.assetUrl === 'string' && body.assetUrl.trim()
        ? body.assetUrl.trim()
        : null;
    const status = assetUrl ? 'succeeded' : 'queued';

    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('generation_takes')
        .insert({
            project_id: projectId,
            segment_id: segmentId,
            media_type: mediaType,
            provider: typeof body.provider === 'string' ? body.provider : 'manual',
            model_id: typeof body.modelId === 'string' ? body.modelId : null,
            prompt: typeof body.prompt === 'string' ? body.prompt : '',
            params: body.params && typeof body.params === 'object' ? body.params : {},
            asset_url: assetUrl,
            thumbnail_url: typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl : null,
            status,
            score: body.score && typeof body.score === 'object' ? body.score : {},
            review_notes: typeof body.reviewNotes === 'string' ? body.reviewNotes : null,
            is_selected: false,
        } as never)
        .select()
        .single();

    if (error) {
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create generation take', error.message);
    }

    return NextResponse.json({ success: true, take: data });
}
