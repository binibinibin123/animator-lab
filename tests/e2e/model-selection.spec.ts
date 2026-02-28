import { expect, test } from '@playwright/test';

const externalAiRegex = /https?:\/\/.*(fal\.ai|googleapis\.com|elevenlabs\.io).*/;

test.describe('Model selection flows @mock', () => {
    test.beforeEach(async ({ page }) => {
        await page.route(externalAiRegex, async (route) => {
            await route.abort();
        });
    });

    test('create/new sends selected image/video model ids @mock', async ({ page }) => {
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

        await page.getByRole('button', { name: 'Nano Banana Pro' }).click();
        await page.getByRole('button', { name: 'Standard Balanced (Hailuo 02 Standard)' }).click();
        await page.getByRole('button', { name: '다음 단계 →' }).click();

        await expect.poll(() => requestBody).not.toBeNull();
        const body = requestBody as { imageModelId?: string; videoModelId?: string } | null;
        expect(body?.imageModelId).toBe('nano-banana-pro');
        expect(body?.videoModelId).toBe('hailuo-02-standard');
    });

    test('create/autopilot sends model ids in payload @mock', async ({ page }) => {
        let requestBody: Record<string, unknown> | null = null;

        await page.route('**/api/autopilot/create', async (route) => {
            requestBody = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: [
                    'event: project_created',
                    'data: {"projectId":"project-e2e-2"}',
                    '',
                    'event: progress',
                    'data: {"progress":100}',
                    '',
                    'event: completed',
                    'data: {"projectId":"project-e2e-2"}',
                    '',
                ].join('\n'),
            });
        });

        await page.goto('/create/autopilot');
        await page.getByRole('button', { name: 'Nano Banana Pro' }).click();
        await page.getByRole('button', { name: 'Standard Plus (LTX Pro)' }).click();
        await page.getByLabel('영상 주제').fill('E2E 테스트 주제');
        await page.getByRole('button', { name: '✨ 오토파일럿 시작하기' }).click();

        await expect.poll(() => requestBody).not.toBeNull();
        const body = requestBody as { imageModelId?: string; videoModelId?: string } | null;
        expect(body?.imageModelId).toBe('nano-banana-pro');
        expect(body?.videoModelId).toBe('ltx-2.0-pro');
    });
});
