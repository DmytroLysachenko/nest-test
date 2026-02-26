import { expect, test } from '@playwright/test';

test('profile management supports save, generate, and restore actions', async ({ page }) => {
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

  await page.route('**/api/profile-inputs/latest', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'pi-2',
            targetRoles: 'Frontend Developer',
            notes: 'Remote first',
            createdAt: '2026-02-20T00:00:00.000Z',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'pi-1',
          targetRoles: 'Backend Developer',
          notes: 'Focus on NestJS',
          createdAt: '2026-02-19T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/profile-inputs', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'pi-2',
          targetRoles: 'Frontend Developer',
          notes: 'Remote first',
          createdAt: '2026-02-20T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'doc-1',
            extractionStatus: 'READY',
          },
        ],
      }),
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

  await page.route('**/api/career-profiles/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'cp-1',
          version: 2,
          status: 'READY',
          isActive: true,
          createdAt: '2026-02-20T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/career-profiles/quality', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          score: 84,
          signals: [
            { key: 'target_roles', status: 'ok', score: 1, message: 'Sufficient evidence present' },
            {
              key: 'technologies_coverage',
              status: 'weak',
              score: 0.7,
              message: 'Signal is present but under-detailed',
            },
          ],
          missing: [],
          recommendations: [
            'Add additional technologies (including transferable ones) with lower confidence where applicable.',
          ],
        },
      }),
    });
  });

  await page.route('**/api/career-profiles?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          items: [
            {
              id: 'cp-1',
              version: 2,
              status: 'READY',
              isActive: true,
              createdAt: '2026-02-20T00:00:00.000Z',
            },
            {
              id: 'cp-0',
              version: 1,
              status: 'READY',
              isActive: false,
              createdAt: '2026-02-19T00:00:00.000Z',
            },
          ],
          total: 2,
        },
      }),
    });
  });

  await page.route('**/api/career-profiles/cp-1/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route('**/api/career-profiles', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'cp-3',
            version: 3,
            status: 'READY',
            isActive: true,
            createdAt: '2026-02-21T00:00:00.000Z',
          },
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/career-profiles/cp-0/restore', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'cp-0',
          version: 1,
          status: 'READY',
          isActive: true,
          createdAt: '2026-02-19T00:00:00.000Z',
        },
      }),
    });
  });

  await page.goto('/app/profile', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Profile Management' })).toBeVisible();

  await page.getByLabel('Target roles').fill('Frontend Developer');
  const saveRequest = page.waitForRequest('**/api/profile-inputs');
  await page.getByRole('button', { name: 'Save profile input' }).click();
  await saveRequest;

  await page.getByLabel('Optional generation instructions').fill('Focus on frontend and remote opportunities.');
  const generateRequest = page.waitForRequest('**/api/career-profiles');
  await page.getByRole('button', { name: 'Generate new profile version' }).click();
  await generateRequest;

  const restoreRequest = page.waitForRequest('**/api/career-profiles/cp-0/restore');
  await page.getByRole('button', { name: 'Restore' }).first().click();
  await restoreRequest;
});
