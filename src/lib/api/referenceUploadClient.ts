export type ReferenceType = 'character' | 'style';

export interface UploadProjectReferenceInput {
    file: File;
    referenceType: ReferenceType;
    projectId?: string;
    uploadSessionId?: string;
}

export interface UploadProjectReferenceResult {
    url: string;
    referenceType: ReferenceType;
    projectId?: string | null;
    uploadSessionId?: string | null;
}

function parseUploadError(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const data = payload as { error?: { message?: string } | string };
    if (!data.error) {
        return null;
    }

    if (typeof data.error === 'string') {
        return data.error;
    }

    if (typeof data.error.message === 'string') {
        return data.error.message;
    }

    return null;
}

export async function uploadProjectReference(input: UploadProjectReferenceInput): Promise<UploadProjectReferenceResult> {
    const formData = new FormData();
    formData.append('referenceType', input.referenceType);
    formData.append('file', input.file);

    if (input.projectId) {
        formData.append('projectId', input.projectId);
    }

    if (input.uploadSessionId) {
        formData.append('uploadSessionId', input.uploadSessionId);
    }

    const response = await fetch('/api/project/reference/upload', {
        method: 'POST',
        body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(parseUploadError(payload) || 'Reference upload failed');
    }

    const data = payload as UploadProjectReferenceResult;
    if (!data.url) {
        throw new Error('Uploaded reference URL is missing');
    }

    return data;
}

export function createUploadSessionId() {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
