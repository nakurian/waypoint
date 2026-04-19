import { test, expect } from '@playwright/test';

test('@visual phase 07', async ({ page }) => {
  await page.goto('/phase/07');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('phase-07.png', { fullPage: true });
});
