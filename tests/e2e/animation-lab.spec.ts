import { expect, test } from '@playwright/test';
import {
    buildStoryBible,
    buildTakeSelectionUpdates,
    summarizeShot,
} from '../../src/lib/animation/storyboard';

const externalAiRegex = /https?:\/\/.*(fal\.ai|googleapis\.com|elevenlabs\.io).*/;

const imageModelsPayload = {
    pricingVersion: 'v1',
    pricingSource: 'registry',
    warnings: [],
    models: [
        {
            id: 'gpt-image-2',
            label: 'Standard · GPT Image 2 medium',
            description: 'Default animation image model',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/cinematic.png',
            provider: 'fal',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'GPT Image 2',
            costModeLabel: 'Standard',
            supportsReference: true,
            defaultQuality: 'medium',
            qualities: [
                { id: 'medium', credits: 55, modeLabel: 'Standard', estimatedUsd: 0.053 },
                { id: 'high', credits: 220, modeLabel: 'Final', estimatedUsd: 0.211 },
            ],
        },
    ],
};

const videoModelsPayload = {
    pricingVersion: 'v1',
    pricingSource: 'registry',
    models: [
        {
            id: 'ltx-2.3-fast',
            label: 'Default · LTX-2.3 Fast',
            description: 'Default animation motion model',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/cinematic.png',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'LTX-2.3 Fast',
            costModeLabel: 'Default',
            defaultDurationSeconds: 6,
            resolutions: [{ id: '1080p', creditsPerCut: 36, estimatedUsdPerCut: 0.3 }],
        },
        {
            id: 'seedance-2.0-fast',
            label: 'Budget · Seedance 2.0 Fast',
            description: 'Fast model-lab comparison option',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/illustration.png',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'Seedance 2.0 Fast',
            costModeLabel: 'Budget',
            defaultDurationSeconds: 6,
            resolutions: [{ id: '720p', creditsPerCut: 30, estimatedUsdPerCut: 0.36 }],
        },
    ],
};

test.describe('Animator Lab workflow @mock', () => {
    test.beforeEach(async ({ page }) => {
        await page.route(externalAiRegex, async (route) => {
            await route.abort();
        });
    });

    test('normalizes story bible and shot metadata for animation production @mock', () => {
        const bible = buildStoryBible({
            topic: 'A courier finds a glowing letter under the Han River bridge',
            genre: 'urban fantasy',
            tone: 'quiet suspense',
            characters: 'Mina, a tired night courier with a yellow raincoat',
            world: 'near-future Seoul after midnight',
            styleRules: 'webtoon-like linework, cinematic lighting',
            negativeRules: 'no horror gore, no extra fingers',
            referenceImageUrl: 'https://example.com/mina.png',
        });

        expect(bible).toMatchObject({
            logline: 'A courier finds a glowing letter under the Han River bridge',
            genre: 'urban fantasy',
            tone: 'quiet suspense',
            characters: 'Mina, a tired night courier with a yellow raincoat',
            world: 'near-future Seoul after midnight',
            styleRules: 'webtoon-like linework, cinematic lighting',
            negativeRules: 'no horror gore, no extra fingers',
            referenceImageUrl: 'https://example.com/mina.png',
        });

        expect(summarizeShot({
            order_index: 2,
            script_text: 'Mina hears the letter whisper her name.',
            visual_description: 'Low-angle shot under wet concrete arches',
            camera_work: 'slow dolly in',
            action_notes: 'Mina freezes and grips the delivery bag',
            lighting_notes: 'green reflection from river water',
            emotion_notes: 'fear mixed with curiosity',
            negative_prompt: 'no comedy expression',
        })).toContain('CUT 3');
    });

    test('builds selected take updates that keep Remotion compatibility @mock', () => {
        expect(buildTakeSelectionUpdates({
            takeId: 'take-image-1',
            segmentId: 'segment-1',
            mediaType: 'image',
            assetUrl: 'https://example.com/cut-1.png',
        })).toEqual({
            selectedTakePatch: { is_selected: true },
            otherTakesPatch: { is_selected: false },
            segmentPatch: { image_url: 'https://example.com/cut-1.png' },
        });

        expect(buildTakeSelectionUpdates({
            takeId: 'take-video-1',
            segmentId: 'segment-1',
            mediaType: 'video',
            assetUrl: 'https://example.com/cut-1.mp4',
        }).segmentPatch).toEqual({ video_url: 'https://example.com/cut-1.mp4' });
    });

    test('comfyui status reports offline without local endpoint configured @mock', async ({ request }) => {
        const response = await request.get('/api/comfyui/status');
        expect(response.ok()).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({
            configured: false,
            online: false,
            provider: 'comfyui',
        });
    });

    test('animation API routes expose validation errors instead of 404s @mock', async ({ request }) => {
        const storyboardResponse = await request.post('/api/animation/storyboard', {
            data: { storyBible: { logline: 'missing project id' } },
        });
        expect(storyboardResponse.status()).toBe(400);
        await expect(storyboardResponse.json()).resolves.toMatchObject({
            error: { code: 'INVALID_INPUT' },
        });

        const takesResponse = await request.post('/api/animation/takes', {
            data: { mediaType: 'image' },
        });
        expect(takesResponse.status()).toBe(400);

        const selectResponse = await request.post('/api/animation/takes/select', {
            data: { takeId: 'take-1' },
        });
        expect(selectResponse.status()).toBe(400);
    });

    test('create/autopilot is rebranded as an animation studio entry point @mock', async ({ page }) => {
        await page.route('**/api/models/image', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(imageModelsPayload) });
        });
        await page.route('**/api/models/video', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(videoModelsPayload) });
        });
        await page.route('**/api/voices', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ voices: [] }) });
        });
        await page.route('**/api/credits/quote', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ quoteCredits: 10 }) });
        });
        await page.route('**/api/comfyui/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ configured: false, online: false, provider: 'comfyui' }),
            });
        });

        await page.goto('/create/autopilot');

        await expect(page.getByTestId('animator-lab-title')).toContainText('Animator Lab');
        await expect(page.getByTestId('story-bible-panel')).toContainText('스토리 바이블');
        await expect(page.getByTestId('shot-board-panel')).toContainText('컷보드');
        await expect(page.getByTestId('model-lab-panel')).toContainText('모델랩');
        await expect(page.getByTestId('comfyui-status')).toContainText('Offline');
    });
});
