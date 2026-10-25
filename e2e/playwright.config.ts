import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests of the demo, driven through the real UI at phone and
 * desktop size. Uses the Google Chrome already installed on the machine
 * (`channel: 'chrome'`); set E2E_CHANNEL= (empty) to use a Playwright-managed
 * Chromium instead.
 */
const PORT = 5182;
const channel = process.env.E2E_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: './tests',
  outputDir: './output/test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['json', { outputFile: './output/results.json' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...(channel ? { channel } : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true },
    },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run dev -w apps/web -- --port ${PORT} --strictPort`,
    cwd: '..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
