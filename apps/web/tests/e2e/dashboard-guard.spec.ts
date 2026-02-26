import { expect, test } from '@playwright/test';

test('dashboard redirects to onboarding when summary requires it', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('career_assistant_access_token', 'test-access-token');
    window.localStorage.setItem('career_assistant_refresh_token', 'test-refresh-token');
  });

  await page.route('**/api/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'user-1', email: 'user@example.com' } }),
    });
  });

  await page.route('**/api/workspace/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          profile: { exists: false, status: null, version: null, updatedAt: null },
          profileInput: { exists: false, updatedAt: null },
          offers: { total: 0, scored: 0, lastUpdatedAt: null },
          scrape: { lastRunStatus: null, lastRunAt: null, totalRuns: 0 },
          workflow: { needsOnboarding: true },
        },
      }),
    });
  });

  await page.route('**/api/job-offers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { items: [], total: 0, mode: 'strict' } }),
    });
  });

  await page.route('**/api/career-profiles/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  await page.route('**/api/onboarding/draft', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  await page.route('**/api/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
  await page.route('**/api/documents/upload-health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          traceId: 'trace-1',
          ok: true,
          bucket: { ok: true, reason: null },
          signedUrl: { ok: true, reason: null },
        },
      }),
    });
  });

  await page.goto('/app', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/app\/onboarding$/);
});
