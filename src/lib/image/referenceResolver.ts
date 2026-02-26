import fs from 'fs';
import path from 'path';
import { createServerClient } from '@/lib/supabase';
import {
    normalizeStyleInput,
    parseCreateVisualMode,
    isPresetStyleKey,
    type StandardErrorCode,
    type VisualMode,
    type ReferenceIntent,
} from '@/lib/api/visualModeValidation';

const ALLOWED_REFERENCE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;
const REFERENCE_FETCH_TIMEOUT_MS = 8000;

export class ResolverError extends Error {
    code: StandardErrorCode;
    status: number;
    details?: unknown;

    constructor(code: StandardErrorCode, status: number, message: string, details?: unknown) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

export interface ResolveReferenceInput {
    projectId?: string;
    segmentId?: string;
    styleOverride?: string;
    styleTextOverride?: string;
}

export interface ResolvedReferenceContext {
    mode: VisualMode;
    projectId: string;
    segmentId: string | null;
    effectiveStylePreset: string;
    effectiveStyleText: string | null;
    referenceUrl: string | null;
    referenceType: ReferenceIntent | null;
    referenceIntent: ReferenceIntent | null;
    referenceImage: string | null;
    referenceMimeType: string | null;
    useLocalPresetReference: boolean;
    warnings: string[];
}

export interface LocalReferenceImage {
    referenceImage: string;
    referenceMimeType: string;
}

function getSupabaseStorageHost() {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!raw) return null;

    try {
        return new URL(raw).hostname;
    } catch {
        return null;
    }
}

function isBlockedHost(hostname: string) {
    if (hostname === 'localhost') {
        return true;
    }

    if (hostname === '127.0.0.1') {
        return false;
    }

    const lower = hostname.toLowerCase();
    if (lower.endsWith('.local')) {
        return true;
    }

    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname)) {
        return true;
    }

    return false;
}

function validateReferenceUrl(urlString: string) {
    const supabaseHost = getSupabaseStorageHost();

    try {
        const parsed = new URL(urlString);

        if (isBlockedHost(parsed.hostname)) {
            return { ok: false, reason: 'Blocked host' } as const;
        }

        if (parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1') {
            return { ok: true } as const;
        }

        if (parsed.protocol !== 'https:') {
            return { ok: false, reason: 'Only https scheme is allowed' } as const;
        }

        if (!supabaseHost) {
            return { ok: false, reason: 'NEXT_PUBLIC_SUPABASE_URL is not configured' } as const;
        }

        if (parsed.hostname !== supabaseHost) {
            return { ok: false, reason: 'Reference host is not allowlisted' } as const;
        }

        return { ok: true } as const;
    } catch {
        return { ok: false, reason: 'Invalid URL format' } as const;
    }
}

export async function loadLocalStyleReferenceImage(stylePreset: string): Promise<LocalReferenceImage | null> {
    if (!stylePreset || stylePreset === 'custom') {
        return null;
    }

    if (!isPresetStyleKey(stylePreset)) {
        return null;
    }

    const extensions: Array<'png' | 'jpg' | 'jpeg'> = ['png', 'jpg', 'jpeg'];

    for (const ext of extensions) {
        const stylePath = path.join(process.cwd(), 'public', 'styles', `${stylePreset}.${ext}`);
        if (!fs.existsSync(stylePath)) continue;

        const imageBuffer = fs.readFileSync(stylePath);
        return {
            referenceImage: imageBuffer.toString('base64'),
            referenceMimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
        };
    }

    return null;
}

async function fetchReferenceImageFromUrl(
    referenceUrl: string,
    warnings: string[]
): Promise<LocalReferenceImage | null> {
    const validation = validateReferenceUrl(referenceUrl);
    if (!validation.ok) {
        warnings.push(`[Resolver] Reference URL blocked: ${validation.reason}`);
        return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REFERENCE_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(referenceUrl, {
            method: 'GET',
            redirect: 'error',
            signal: controller.signal,
        });

        if (!response.ok) {
            warnings.push(`[Resolver] Reference fetch failed with status ${response.status}`);
            return null;
        }

        const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
        if (!ALLOWED_REFERENCE_MIME_TYPES.has(mimeType)) {
            warnings.push('[Resolver] Reference MIME type is not supported');
            return null;
        }

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > MAX_REFERENCE_BYTES) {
            warnings.push('[Resolver] Reference image exceeds max size');
            return null;
        }

        return {
            referenceImage: bytes.toString('base64'),
            referenceMimeType: mimeType,
        };
    } catch (error) {
        warnings.push('[Resolver] Reference fetch failed');
        console.warn('[Resolver] Reference fetch error:', error);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export async function resolveReferenceContext(input: ResolveReferenceInput): Promise<ResolvedReferenceContext> {
    if (!input.projectId && !input.segmentId) {
        throw new ResolverError('INVALID_INPUT', 400, 'projectId or segmentId is required');
    }

    const supabase = createServerClient();
    let projectId = input.projectId || null;
    let segmentId = input.segmentId || null;

    if (!projectId && segmentId) {
        const { data: segmentData, error: segmentError } = await supabase
            .from('segments')
            .select('id, project_id')
            .eq('id', segmentId)
            .single();

        const segment = segmentData as { id: string; project_id: string } | null;

        if (segmentError || !segment) {
            throw new ResolverError('SEGMENT_NOT_FOUND', 404, 'Segment not found', segmentError?.message);
        }

        projectId = segment.project_id;
    }

    if (!projectId) {
        throw new ResolverError('INVALID_INPUT', 400, 'projectId could not be resolved');
    }

    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, style, style_text, visual_mode, character_reference_url, style_reference_url')
        .eq('id', projectId)
        .single();

    const project = projectData as {
        id: string;
        style: string;
        style_text: string | null;
        visual_mode: VisualMode | null;
        character_reference_url: string | null;
        style_reference_url: string | null;
    } | null;

    if (projectError || !project) {
        throw new ResolverError('PROJECT_NOT_FOUND', 404, 'Project not found', projectError?.message);
    }

    const mode = parseCreateVisualMode(project.visual_mode) || 'legacy';
    const warnings: string[] = [];

    let effectiveStyle = normalizeStyleInput(project.style, project.style_text);
    if (
        mode === 'legacy' &&
        (input.styleOverride !== undefined || input.styleTextOverride !== undefined)
    ) {
        const overrideStyle = input.styleOverride !== undefined ? input.styleOverride : project.style;
        const overrideStyleText =
            input.styleTextOverride !== undefined ? input.styleTextOverride : project.style_text;
        effectiveStyle = normalizeStyleInput(overrideStyle, overrideStyleText);
    }

    let referenceUrl: string | null = null;
    let referenceType: ReferenceIntent | null = null;
    let referenceIntent: ReferenceIntent | null = null;
    let useLocalPresetReference = false;

    if (mode === 'character_fixed') {
        if (project.character_reference_url) {
            referenceUrl = project.character_reference_url;
            referenceType = 'character';
            referenceIntent = 'character';
        } else {
            warnings.push('[Resolver] character_fixed mode without character reference URL');
        }
    } else if (mode === 'style_fixed') {
        if (project.style_reference_url) {
            referenceUrl = project.style_reference_url;
            referenceType = 'style';
            referenceIntent = 'style';
        } else if (!effectiveStyle.styleText && effectiveStyle.style !== 'custom') {
            useLocalPresetReference = true;
            referenceType = 'style';
            referenceIntent = 'style';
        }
    } else if (mode === 'legacy' && effectiveStyle.style !== 'custom') {
        useLocalPresetReference = true;
    }

    let referenceImage: string | null = null;
    let referenceMimeType: string | null = null;

    if (referenceUrl) {
        const remoteReference = await fetchReferenceImageFromUrl(referenceUrl, warnings);
        if (remoteReference) {
            referenceImage = remoteReference.referenceImage;
            referenceMimeType = remoteReference.referenceMimeType;
        } else {
            referenceUrl = null;
            referenceType = null;
            referenceIntent = null;
        }
    }

    if (!referenceImage && useLocalPresetReference) {
        const localReference = await loadLocalStyleReferenceImage(effectiveStyle.style);
        if (localReference) {
            referenceImage = localReference.referenceImage;
            referenceMimeType = localReference.referenceMimeType;
        }
    }

    return {
        mode,
        projectId: project.id,
        segmentId,
        effectiveStylePreset: effectiveStyle.style,
        effectiveStyleText: effectiveStyle.styleText,
        referenceUrl,
        referenceType,
        referenceIntent,
        referenceImage,
        referenceMimeType,
        useLocalPresetReference,
        warnings,
    };
}
