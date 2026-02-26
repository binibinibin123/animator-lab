import { STYLE_PRESETS } from '@/lib/ai/nanobanana';

export type VisualMode = 'legacy' | 'character_fixed' | 'style_fixed';
export type ReferenceIntent = 'character' | 'style';

export const VISUAL_MODE_VALUES: VisualMode[] = ['legacy', 'character_fixed', 'style_fixed'];
export const VALID_VISUAL_MODES = new Set<VisualMode>(VISUAL_MODE_VALUES);
export const STYLE_PRESET_KEYS = new Set(Object.keys(STYLE_PRESETS));

export type StandardErrorCode =
    | 'UNAUTHORIZED'
    | 'INVALID_INPUT'
    | 'INVALID_VISUAL_MODE'
    | 'PROJECT_NOT_FOUND'
    | 'SEGMENT_NOT_FOUND'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_MEDIA_TYPE'
    | 'REFERENCE_URL_BLOCKED'
    | 'REFERENCE_FETCH_FAILED'
    | 'INTERNAL_ERROR';

export function parseCreateVisualMode(rawMode: unknown): VisualMode | null {
    if (rawMode === undefined || rawMode === null || rawMode === '') {
        return 'legacy';
    }

    if (VALID_VISUAL_MODES.has(rawMode as VisualMode)) {
        return rawMode as VisualMode;
    }

    return null;
}

export function parseUpdateVisualMode(rawMode: unknown): VisualMode | undefined | null {
    if (rawMode === undefined) {
        return undefined;
    }

    if (VALID_VISUAL_MODES.has(rawMode as VisualMode)) {
        return rawMode as VisualMode;
    }

    return null;
}

export function isPresetStyleKey(style: unknown) {
    return typeof style === 'string' && STYLE_PRESET_KEYS.has(style.trim());
}

export function normalizeStyleInput(rawStyle: unknown, rawStyleText: unknown) {
    const style = typeof rawStyle === 'string' ? rawStyle.trim() : '';
    const styleText = typeof rawStyleText === 'string' ? rawStyleText.trim() : '';

    if (style === 'custom') {
        return {
            style: 'custom',
            styleText: styleText || null,
            source: 'custom' as const,
        };
    }

    if (style && STYLE_PRESET_KEYS.has(style)) {
        return {
            style,
            styleText: null,
            source: 'preset' as const,
        };
    }

    if (style && !STYLE_PRESET_KEYS.has(style)) {
        return {
            style: 'custom',
            styleText: style,
            source: 'legacy' as const,
        };
    }

    if (styleText) {
        return {
            style: 'custom',
            styleText,
            source: 'custom' as const,
        };
    }

    return {
        style: 'anime',
        styleText: null,
        source: 'preset' as const,
    };
}
