import { expect, test } from '@playwright/test';

test('notebook page renders offers and sends actions', async ({ page }) => {
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'pi-1',
          targetRoles: 'Backend Developer',
          notes: 'Focus on TypeScript/NestJS',
          createdAt: '2026-02-01T00:00:00.000Z',
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

  await page.route('**/api/career-profiles/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'cp-1',
          status: 'READY',
        },
      }),
    });
  });

  await page.route('**/api/job-sources/runs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          mode: 'strict',
          items: [
            {
              id: 'run-1',
              status: 'COMPLETED',
            },
          ],
          total: 1,
        },
      }),
    });
  });

  await page.route('**/api/job-offers?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          items: [
            {
              id: 'ujo-1',
              jobOfferId: 'offer-1',
              sourceRunId: 'run-1',
              status: 'NEW',
              matchScore: 62,
              rankingScore: 62,
              explanationTags: ['hard_constraints_ok', 'seniority_match', 'skill_partial'],
              matchMeta: { summary: 'Good backend match' },
              notes: null,
              tags: ['backend'],
              statusHistory: [{ status: 'NEW', changedAt: '2026-02-01T00:00:00.000Z' }],
              lastStatusAt: '2026-02-01T00:00:00.000Z',
              source: 'PRACUJ_PL',
              url: 'https://it.pracuj.pl/praca/test,oferta,1',
              title: 'Backend Developer',
              company: 'Test Company',
              location: 'Gdynia',
              salary: '12 000 - 16 000 PLN',
              employmentType: 'B2B',
              description: 'Build NestJS services',
              requirements: ['TypeScript', 'Node.js'],
              details: { benefits: ['Remote'] },
              createdAt: '2026-02-01T00:00:00.000Z',
            },
          ],
          total: 1,
        },
      }),
    });
  });

  await page.route('**/api/job-offers/ujo-1/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'ujo-1',
          status: 'NEW',
          statusHistory: [{ status: 'NEW', changedAt: '2026-02-01T00:00:00.000Z' }],
          lastStatusAt: '2026-02-01T00:00:00.000Z',
          jobOfferId: 'offer-1',
          title: 'Backend Developer',
          company: 'Test Company',
          url: 'https://it.pracuj.pl/praca/test,oferta,1',
        },
      }),
    });
  });

  await page.route('**/api/job-offers/ujo-1/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'ujo-1', status: 'SAVED' } }),
    });
  });

  await page.route('**/api/job-offers/ujo-1/meta', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'ujo-1', notes: 'note', tags: ['smoke'] } }),
    });
  });

  await page.route('**/api/job-offers/ujo-1/score', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          score: 75,
          isMatch: true,
          matchMeta: {
            summary: 'Strong backend fit',
            matchedSkills: ['TypeScript'],
            matchedRoles: ['Backend Developer'],
            matchedStrengths: ['API design'],
            matchedKeywords: ['nestjs'],
          },
        },
      }),
    });
  });

  await page.goto('/app/notebook', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Job Notebook')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Backend Developer')).toBeVisible();
  await expect(page.getByLabel('Mode')).toHaveValue('strict');

  await page
    .getByRole('button', { name: /Backend Developer/ })
    .first()
    .click();

  const statusRequest = page.waitForRequest('**/api/job-offers/ujo-1/status');
  await page.getByRole('button', { name: 'SAVED' }).first().click();
  await statusRequest;

  await page.getByLabel('Notes', { exact: true }).fill('smoke note');
  await page.getByLabel('Tags (comma separated)').fill('smoke, backend');

  const metaRequest = page.waitForRequest('**/api/job-offers/ujo-1/meta');
  await page.getByRole('button', { name: 'Save notes/tags' }).click();
  await metaRequest;

  const scoreRequest = page.waitForRequest('**/api/job-offers/ujo-1/score');
  await page.getByRole('button', { name: 'Re-score offer' }).click();
  await scoreRequest;
});
