import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_REFERENCE_TYPES = new Set(['character', 'style']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

function extensionFromMimeType(mimeType: string, fallbackName: string) {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/webp') return 'webp';

    const fallbackExt = fallbackName.split('.').pop()?.toLowerCase();
    if (fallbackExt && ['png', 'jpg', 'jpeg', 'webp'].includes(fallbackExt)) {
        return fallbackExt === 'jpeg' ? 'jpg' : fallbackExt;
    }

    return 'png';
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    try {
        const formData = await request.formData();

        const projectId = formData.get('projectId');
        const referenceType = formData.get('referenceType');
        const file = formData.get('file');

        if (typeof projectId !== 'string' || !projectId.trim()) {
            return errorResponse(400, 'INVALID_INPUT', 'projectId is required');
        }

        if (typeof referenceType !== 'string' || !ALLOWED_REFERENCE_TYPES.has(referenceType)) {
            return errorResponse(400, 'INVALID_INPUT', 'referenceType must be character or style');
        }

        if (!(file instanceof File)) {
            return errorResponse(400, 'INVALID_INPUT', 'file is required');
        }

        if (file.size <= 0) {
            return errorResponse(400, 'INVALID_INPUT', 'file must not be empty');
        }

        if (file.size > MAX_FILE_BYTES) {
            return errorResponse(413, 'FILE_TOO_LARGE', 'File size exceeds 5MB limit');
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only PNG, JPEG, WEBP are supported');
        }

        const supabase = createServerClient();

        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return errorResponse(404, 'PROJECT_NOT_FOUND', 'Project not found');
        }

        const ext = extensionFromMimeType(file.type, file.name || 'reference');
        const storagePath = `project-references/${projectId}/${referenceType}-${Date.now()}.${ext}`;
        const bytes = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase
            .storage
            .from('autovideo-media')
            .upload(storagePath, bytes, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            return errorResponse(500, 'INTERNAL_ERROR', 'Failed to upload reference image', uploadError.message);
        }

        const { data: publicUrlData } = supabase
            .storage
            .from('autovideo-media')
            .getPublicUrl(storagePath);

        return NextResponse.json({
            url: publicUrlData.publicUrl,
            referenceType,
            projectId,
        });
    } catch (error: any) {
        console.error('[Reference Upload] Error:', error);
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to process upload', error?.message);
    }
}
