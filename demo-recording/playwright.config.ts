import { defineConfig } from '@playwright/test';

/**
 * Records the demo click paths as videos. Each test in flows/ is one take.
 * Output: demo-recording/output/videos/<project>/<flow>.webm
 */
const PORT = 5181;

export default defineConfig({
  testDir: './flows',
  outputDir: './output/test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    video: 'on',
    trace: 'off',
    screenshot: 'off',
    // A steady pace that reads well on video.
    launchOptions: { slowMo: 120 },
  },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
        video: { mode: 'on', size: { width: 1440, height: 900 } },
      },
    },
    {
      name: 'phone',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        video: { mode: 'on', size: { width: 390, height: 844 } },
      },
    },
  ],
  webServer: {
    command: `npm run dev -w apps/web -- --port ${PORT} --strictPort`,
    cwd: '..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
