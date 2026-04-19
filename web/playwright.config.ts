import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/visual',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
