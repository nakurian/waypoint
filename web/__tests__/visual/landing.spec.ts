import { test, expect } from '@playwright/test';

test('@visual landing', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing.png', { fullPage: true });
});
