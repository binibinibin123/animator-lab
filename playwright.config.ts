import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT || '3000';
const e2eBaseUrl = process.env.E2E_BASE_URL || `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: true,
    reporter: 'list',
    use: {
        baseURL: e2eBaseUrl,
        trace: 'on-first-retry',
    },
    webServer: {
        command: `npm run dev -- -p ${e2ePort}`,
        url: e2eBaseUrl,
        reuseExistingServer: true,
        timeout: 120_000,
    },
    projects: [
        {
            name: 'mocked-e2e',
            testDir: './tests/e2e',
            grep: /@mock/,
            use: {
                ...devices['Desktop Chrome'],
                extraHTTPHeaders: {
                    'x-test-mode': 'true',
                },
            },
        },
        {
            name: 'smoke-real',
            testDir: './tests/smoke',
            grep: /@smoke-real/,
            use: {
                ...devices['Desktop Chrome'],
            },
        },
    ],
});
