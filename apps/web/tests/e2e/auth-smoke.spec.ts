import { expect, test } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
