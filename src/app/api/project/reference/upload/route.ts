import { NextRequest, NextResponse } from 'next/server';
import { hasApiAuthUser } from '@/lib/api/authGuard';
import { getReferenceUploadMaxMb, isAllowedReferenceMimeType, REFERENCE_UPLOAD_MAX_BYTES } from '@/lib/api/referenceUploadConfig';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const ALLOWED_REFERENCE_TYPES = new Set(['character', 'style']);
const UPLOAD_SESSION_ID_REGEX = /^[A-Za-z0-9_-]{8,120}$/;

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
    const authenticated = await hasApiAuthUser();
    if (!authenticated) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    try {
        const formData = await request.formData();

        const projectId = formData.get('projectId');
        const uploadSessionId = formData.get('uploadSessionId');
        const referenceType = formData.get('referenceType');
        const file = formData.get('file');

        const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : '';
        const normalizedUploadSessionId = typeof uploadSessionId === 'string' ? uploadSessionId.trim() : '';
        const hasProjectId = !!normalizedProjectId;
        const hasUploadSessionId = !!normalizedUploadSessionId;

        if (!hasProjectId && !hasUploadSessionId) {
            return errorResponse(400, 'INVALID_INPUT', 'projectId or uploadSessionId is required');
        }

        if (hasProjectId && hasUploadSessionId) {
            return errorResponse(400, 'INVALID_INPUT', 'Provide either projectId or uploadSessionId, not both');
        }

        if (typeof referenceType !== 'string' || !ALLOWED_REFERENCE_TYPES.has(referenceType)) {
            return errorResponse(400, 'INVALID_INPUT', 'referenceType must be character or style');
        }

        if (hasUploadSessionId) {
            if (!UPLOAD_SESSION_ID_REGEX.test(normalizedUploadSessionId)) {
                return errorResponse(400, 'INVALID_INPUT', 'uploadSessionId format is invalid');
            }
        }

        if (!(file instanceof File)) {
            return errorResponse(400, 'INVALID_INPUT', 'file is required');
        }

        if (file.size <= 0) {
            return errorResponse(400, 'INVALID_INPUT', 'file must not be empty');
        }

        if (file.size > REFERENCE_UPLOAD_MAX_BYTES) {
            return errorResponse(413, 'FILE_TOO_LARGE', `File size exceeds ${getReferenceUploadMaxMb()}MB limit`);
        }

        if (!isAllowedReferenceMimeType(file.type)) {
            return errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only PNG, JPEG, WEBP are supported');
        }

        const supabase = createServerClient();

        if (hasProjectId) {
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('id')
                .eq('id', normalizedProjectId)
                .single();

            if (projectError || !project) {
                return errorResponse(404, 'PROJECT_NOT_FOUND', 'Project not found');
            }
        }

        const ext = extensionFromMimeType(file.type, file.name || 'reference');
        const targetId = hasProjectId ? normalizedProjectId : normalizedUploadSessionId;
        const storagePath = hasProjectId
            ? `project-references/${targetId}/${referenceType}-${Date.now()}.${ext}`
            : `project-references/pending/${targetId}/${referenceType}-${Date.now()}.${ext}`;
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
            projectId: hasProjectId ? targetId : null,
            uploadSessionId: hasUploadSessionId ? targetId : null,
        });
    } catch (error: any) {
        console.error('[Reference Upload] Error:', error);
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to process upload', error?.message);
    }
}
