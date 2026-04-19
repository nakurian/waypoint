import { test, expect } from '@playwright/test';

test('@visual install with claude+cruise preselected', async ({ page }) => {
  await page.goto('/install?role=developer&ide=claude&pack=cruise');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('install.png', { fullPage: true });
});
