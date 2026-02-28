import { expect, test } from '@playwright/test';

test.describe('Real smoke @smoke-real', () => {
    test.skip(!process.env.RUN_REAL_SMOKE, 'RUN_REAL_SMOKE is not enabled');

    test('create page loads', async ({ page }) => {
        await page.goto('/create/new');
        await expect(page.getByText('새 프로젝트 만들기')).toBeVisible();
    });
});
