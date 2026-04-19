import { test, expect } from '@playwright/test';

test('@visual packs/compare with cruise tab active', async ({ page }) => {
  await page.goto('/packs/compare');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('packs-compare.png', { fullPage: true });
});
