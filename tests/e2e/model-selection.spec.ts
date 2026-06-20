import { expect, test } from '@playwright/test';

const externalAiRegex = /https?:\/\/.*(fal\.ai|googleapis\.com|elevenlabs\.io).*/;

const imageModelsPayload = {
    pricingVersion: 'v1',
    pricingSource: 'registry',
    warnings: [],
    models: [
        {
            id: 'gpt-image-2',
            label: '표준 · GPT Image 2 medium',
            description: 'OpenAI GPT Image 2를 fal.ai에서 실행합니다.',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/cinematic.png',
            fallbackPreviewImageUrl: '/styles/cinematic.png',
            provider: 'fal',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'GPT Image 2',
            costModeLabel: '표준',
            supportsReference: true,
            defaultQuality: 'medium',
            qualities: [
                { id: 'low', credits: 7, modeLabel: '초안', estimatedUsd: 0.006 },
                { id: 'medium', credits: 55, modeLabel: '표준', estimatedUsd: 0.053 },
                { id: 'high', credits: 220, modeLabel: '최종', estimatedUsd: 0.211 },
            ],
        },
        {
            id: 'flux-2-pro',
            label: '프리미엄 · FLUX.2 pro',
            description: 'FLUX.2 pro 고품질 이미지 모델입니다.',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/realistic.png',
            fallbackPreviewImageUrl: '/styles/realistic.png',
            provider: 'fal',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'FLUX.2 pro',
            costModeLabel: '프리미엄',
            supportsReference: true,
            defaultQuality: 'medium',
            qualities: [
                { id: 'medium', credits: 36, modeLabel: '표준', estimatedUsd: 0.03 },
                { id: 'high', credits: 65, modeLabel: '최종', estimatedUsd: 0.054 },
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
            label: '기본 · LTX-2.3 Fast',
            description: 'LTX-2.3 Fast 이미지 기반 영상 모델입니다.',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/cinematic.png',
            fallbackPreviewImageUrl: '/styles/cinematic.png',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'LTX-2.3 Fast',
            costModeLabel: '기본',
            defaultDurationSeconds: 6,
            resolutions: [{ id: '1080p', creditsPerCut: 36, estimatedUsdPerCut: 0.3 }],
        },
        {
            id: 'grok-imagine-video',
            label: '가성비 · Grok Imagine Video',
            description: '720p 중심의 가성비 I2V 모델입니다.',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/neon.png',
            fallbackPreviewImageUrl: '/styles/neon.png',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'Grok Imagine Video',
            costModeLabel: '가성비',
            defaultDurationSeconds: 6,
            resolutions: [{ id: '720p', creditsPerCut: 42, estimatedUsdPerCut: 0.42 }],
        },
        {
            id: 'sora-2',
            label: '프리미엄 · Sora 2',
            description: 'OpenAI Sora 2 I2V 프리미엄 모델입니다.',
            previewSource: 'reference_placeholder',
            previewSourceLabel: 'Reference image · not a model output',
            previewImageUrl: '/styles/cinematic.png',
            fallbackPreviewImageUrl: '/styles/cinematic.png',
            providerDisplayName: 'fal.ai',
            modelDisplayName: 'Sora 2',
            costModeLabel: '프리미엄',
            defaultDurationSeconds: 8,
            resolutions: [{ id: '720p', creditsPerCut: 80, estimatedUsdPerCut: 0.8 }],
        },
    ],
};

test.describe('Model selection flows @mock', () => {
    test.beforeEach(async ({ page }) => {
        await page.route(externalAiRegex, async (route) => {
            await route.abort();
        });
    });

    test('create/new defers model choice to step pages @mock', async ({ page }) => {
        let requestBody: Record<string, unknown> | null = null;

        await page.route('**/api/project', async (route) => {
            requestBody = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    project: { id: 'project-e2e-1' },
                }),
            });
        });

        await page.goto('/create/new');

        await page.getByRole('button', { name: /9:16/ }).click();
        await page.getByRole('button', { name: /가로 컷을 세로로 리프레임/ }).click();
        await page.locator('#logline').fill('새벽 한강 다리 아래에서 빛나는 편지를 발견한 소녀의 이야기');
        await page.getByRole('button', { name: /스토리 바이블 만들기/ }).click();

        await expect.poll(() => requestBody).not.toBeNull();
        const body = requestBody as {
            imageModelId?: string;
            videoModelId?: string;
            aspectRatio?: string;
            renderStrategy?: string;
            productionMode?: string;
            storyBible?: { directionTemplate?: string };
        } | null;
        expect(body?.imageModelId).toBeUndefined();
        expect(body?.videoModelId).toBeUndefined();
        expect(body?.aspectRatio).toBe('9:16');
        expect(body?.renderStrategy).toBe('reframe_portrait');
        expect(body?.productionMode).toBe('animation');
        expect(body?.storyBible?.directionTemplate).toBe('웹툰 컷신');
    });

    test('create/autopilot exposes upgraded models and sends selected ids @mock', async ({ page }) => {
        let requestBody: Record<string, unknown> | null = null;

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
        await page.route('**/api/autopilot/create', async (route) => {
            requestBody = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: [
                    'event: project_created',
                    'data: {"projectId":"project-e2e-2"}',
                    '',
                    'event: completed',
                    'data: {"projectId":"project-e2e-2"}',
                    '',
                ].join('\n'),
            });
        });

        await page.goto('/create/autopilot');

        await page.getByTestId('advanced-model-toggle').click();
        await expect(page.getByTestId('image-model-gpt-image-2')).toContainText('GPT Image 2');
        await expect(page.getByTestId('video-model-ltx-2.3-fast')).toContainText('LTX-2.3 Fast');
        await expect(page.getByTestId('video-model-grok-imagine-video')).toContainText('Grok Imagine Video');
        await expect(page.getByTestId('image-preview-source-gpt-image-2')).toContainText('not a model output');
        await expect(page.getByTestId('video-preview-source-grok-imagine-video')).toContainText('not a model output');
        await page.getByTestId('video-model-sora-2').click();
        await page.getByTestId('image-quality-high').click();
        await page.locator('#autopilot-topic').fill('E2E test topic');
        await page.getByTestId('start-autopilot').click();

        await expect.poll(() => requestBody).not.toBeNull();
        const body = requestBody as {
            imageModelId?: string;
            imageQuality?: string;
            videoModelId?: string;
            aspectRatio?: string;
            persona?: string;
            storyBible?: { directionTemplate?: string };
        } | null;
        expect(body?.imageModelId).toBe('gpt-image-2');
        expect(body?.imageQuality).toBe('high');
        expect(body?.videoModelId).toBe('sora-2');
        expect(body?.aspectRatio).toBe('9:16');
        expect(body?.persona).toBe('ani_webtoon_cutscene');
        expect(body?.storyBible?.directionTemplate).toBe('웹툰 컷신');
    });
});
