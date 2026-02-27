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
  await page.route('**/api/job-sources/runs/diagnostics/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          windowHours: 72,
          status: { total: 0, pending: 0, running: 0, completed: 0, failed: 0 },
          performance: {
            avgDurationMs: null,
            p95DurationMs: null,
            avgScrapedCount: null,
            avgTotalFound: null,
            successRate: 0,
          },
          failures: { timeout: 0, network: 0, validation: 0, parse: 0, callback: 0, unknown: 0 },
        },
      }),
    });
  });
  await page.route('**/api/documents/diagnostics/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          windowHours: 168,
          generatedAt: '2026-02-27T00:00:00.000Z',
          totals: { documentsWithMetrics: 0, samples: 0 },
          stages: {
            UPLOAD_CONFIRM: { count: 0, successRate: 0, avgDurationMs: null, p50DurationMs: null, p95DurationMs: null },
            EXTRACTION: { count: 0, successRate: 0, avgDurationMs: null, p50DurationMs: null, p95DurationMs: null },
            TOTAL_PIPELINE: {
              count: 0,
              successRate: 0,
              avgDurationMs: null,
              p50DurationMs: null,
              p95DurationMs: null,
            },
          },
        },
      }),
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
