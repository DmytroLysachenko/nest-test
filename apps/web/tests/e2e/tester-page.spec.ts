import { expect, test } from '@playwright/test';

test('tester page can send a mocked API request and render response payload', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('career_assistant_access_token', 'test-access-token');
    window.localStorage.setItem('career_assistant_refresh_token', 'test-refresh-token');
  });

  await page.route('**/api/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'user-1',
          email: 'admin@example.com',
        },
      }),
    });
  });

  await page.route('**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto('/app/tester', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('E2E Tester')).toBeVisible();

  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/health'));
  await page.getByRole('button', { name: 'Send request' }).click();
  await requestPromise;

  await expect(page.getByText('Response: 200 (ok)')).toBeVisible();
  await expect(page.getByText('"ok": true')).toBeVisible();
});
