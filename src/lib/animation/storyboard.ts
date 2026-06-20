export type AnimationMediaType = 'image' | 'video' | 'audio';

export interface StoryBibleInput {
    topic?: string | null;
    logline?: string | null;
    genre?: string | null;
    tone?: string | null;
    characters?: string | null;
    world?: string | null;
    styleRules?: string | null;
    negativeRules?: string | null;
    directionTemplate?: string | null;
    targetCutCount?: number | null;
    referenceImageUrl?: string | null;
}

export interface StoryBible {
    logline: string;
    genre: string;
    tone: string;
    characters: string;
    world: string;
    styleRules: string;
    negativeRules: string;
    directionTemplate: string;
    targetCutCount: number | null;
    referenceImageUrl: string | null;
}

export interface ShotSummaryInput {
    order_index?: number | null;
    script_text?: string | null;
    visual_description?: string | null;
    camera_work?: string | null;
    action_notes?: string | null;
    lighting_notes?: string | null;
    emotion_notes?: string | null;
    negative_prompt?: string | null;
}

export interface TakeSelectionInput {
    takeId: string;
    segmentId: string;
    mediaType: AnimationMediaType;
    assetUrl: string;
}

export function cleanText(value: unknown, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function buildStoryBible(input: StoryBibleInput): StoryBible {
    const logline = cleanText(input.logline, cleanText(input.topic, 'Untitled animation work'));

    return {
        logline,
        genre: cleanText(input.genre, 'animation drama'),
        tone: cleanText(input.tone, 'cinematic and emotionally clear'),
        characters: cleanText(input.characters, 'Define the main character before generating shots.'),
        world: cleanText(input.world, 'A coherent animated world with consistent props and lighting.'),
        styleRules: cleanText(input.styleRules, 'Consistent character design, readable silhouettes, webtoon-ready staging.'),
        negativeRules: cleanText(input.negativeRules, 'No off-model faces, no extra fingers, no unreadable text, no broken anatomy.'),
        directionTemplate: cleanText(input.directionTemplate, 'Webtoon cutscene'),
        targetCutCount: Number.isFinite(Number(input.targetCutCount)) ? Number(input.targetCutCount) : null,
        referenceImageUrl: cleanText(input.referenceImageUrl) || null,
    };
}

export function summarizeShot(shot: ShotSummaryInput) {
    const cutNumber = Number.isFinite(Number(shot.order_index)) ? Number(shot.order_index) + 1 : 1;
    const parts = [
        `CUT ${cutNumber}`,
        cleanText(shot.script_text),
        cleanText(shot.visual_description),
        cleanText(shot.camera_work) ? `Camera: ${cleanText(shot.camera_work)}` : '',
        cleanText(shot.action_notes) ? `Action: ${cleanText(shot.action_notes)}` : '',
        cleanText(shot.lighting_notes) ? `Lighting: ${cleanText(shot.lighting_notes)}` : '',
        cleanText(shot.emotion_notes) ? `Emotion: ${cleanText(shot.emotion_notes)}` : '',
        cleanText(shot.negative_prompt) ? `Avoid: ${cleanText(shot.negative_prompt)}` : '',
    ].filter(Boolean);

    return parts.join('\n');
}

export function buildTakeSelectionUpdates(input: TakeSelectionInput) {
    const segmentPatch =
        input.mediaType === 'image'
            ? { image_url: input.assetUrl }
            : input.mediaType === 'video'
                ? { video_url: input.assetUrl }
                : { audio_url: input.assetUrl };

    return {
        selectedTakePatch: { is_selected: true },
        otherTakesPatch: { is_selected: false },
        segmentPatch,
    };
}
