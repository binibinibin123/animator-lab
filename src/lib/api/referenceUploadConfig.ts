export const REFERENCE_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

export const REFERENCE_UPLOAD_ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
] as const;

export function isAllowedReferenceMimeType(mimeType: string) {
    return REFERENCE_UPLOAD_ALLOWED_MIME_TYPES.includes(mimeType as (typeof REFERENCE_UPLOAD_ALLOWED_MIME_TYPES)[number]);
}

export function getReferenceUploadMaxMb() {
    return Math.round(REFERENCE_UPLOAD_MAX_BYTES / (1024 * 1024));
}

export function validateReferenceUploadFile(file: { size: number; type: string }) {
    if (!isAllowedReferenceMimeType(file.type)) {
        return 'PNG, JPG, WEBP 파일만 업로드할 수 있습니다.';
    }

    if (file.size > REFERENCE_UPLOAD_MAX_BYTES) {
        return `이미지 크기는 ${getReferenceUploadMaxMb()}MB 이하로 업로드해 주세요.`;
    }

    return null;
}
