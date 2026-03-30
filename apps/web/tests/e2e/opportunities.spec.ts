import { expect, test } from '@playwright/test';

test('opportunities page renders discovery queue and sends save action', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('career_assistant_access_token', 'test-access-token');
    window.localStorage.setItem('career_assistant_refresh_token', 'test-refresh-token');
  });

  await page.route('**/api/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'user-1', email: 'admin@example.com' } }),
    });
  });

  await page.route('**/api/workspace/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          profile: { exists: true, status: 'READY', version: 1, updatedAt: '2026-02-01T00:00:00.000Z' },
          profileInput: { exists: true, updatedAt: '2026-02-01T00:00:00.000Z' },
          offers: {
            total: 4,
            scored: 3,
            saved: 1,
            applied: 1,
            interviewing: 0,
            offersMade: 0,
            rejected: 0,
            followUpDue: 1,
            lastUpdatedAt: '2026-02-01T00:00:00.000Z',
          },
          documents: { total: 1, ready: 1, pending: 0, failed: 0 },
          scrape: { lastRunStatus: 'COMPLETED', lastRunAt: '2026-02-01T00:00:00.000Z', lastRunProgress: null, totalRuns: 1 },
          workflow: { needsOnboarding: false },
          nextAction: {
            key: 'review-opportunities',
            title: 'Review fresh opportunities',
            description: 'Use opportunities for discovery and notebook for active workflow.',
            href: '/opportunities?focus=strictTop',
            priority: 'recommended',
          },
          activity: [],
          health: { readinessScore: 100, blockers: [], scrapeReliability: 'stable' },
          readinessBreakdown: [],
          blockerDetails: [],
          recommendedSequence: ['planning', 'opportunities', 'notebook'],
        },
      }),
    });
  });

  for (const endpoint of ['profile-inputs/latest', 'career-profiles/latest', 'documents']) {
    await page.route(`**/api/${endpoint}`, async (route) => {
      const payload =
        endpoint === 'documents'
          ? [{ id: 'doc-1', extractionStatus: 'READY' }]
          : endpoint === 'career-profiles/latest'
            ? { id: 'cp-1', status: 'READY' }
            : { id: 'pi-1', targetRoles: 'Frontend Developer', notes: 'fixture', createdAt: '2026-02-01T00:00:00.000Z' };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: payload }),
      });
    });
  }

  await page.route('**/api/job-sources/schedule', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          enabled: false,
          cron: '0 9 * * *',
          timezone: 'Europe/Warsaw',
          source: 'pracuj-pl-it',
          limit: 20,
          careerProfileId: 'cp-1',
          filters: null,
          lastTriggeredAt: null,
          nextRunAt: null,
          lastRunStatus: 'COMPLETED',
        },
      }),
    });
  });

  await page.route('**/api/job-offers/discovery/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total: 2,
          unseen: 1,
          reviewed: 0,
          inPipeline: 1,
          buckets: [
            { key: 'new', label: 'Unseen', count: 1 },
            { key: 'seen', label: 'Reviewed', count: 0 },
            { key: 'pipeline', label: 'In pipeline', count: 1 },
          ],
        },
      }),
    });
  });

  await page.route('**/api/job-offers/discovery?**', async (route) => {
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
              matchScore: 84,
              rankingScore: 84,
              fitSummary: 'Strong React fit for your current profile.',
              fitHighlights: ['Strong React fit for your current profile.', 'Strong overall fit'],
              isInPipeline: false,
              explanationTags: ['hard_constraints_ok'],
              followUpState: 'none',
              matchMeta: { llmSummary: 'Strong React fit for your current profile.' },
              pipelineMeta: null,
              prepMaterials: null,
              notes: null,
              tags: ['frontend'],
              statusHistory: [],
              lastStatusAt: '2026-02-01T00:00:00.000Z',
              source: 'PRACUJ_PL',
              url: 'https://it.pracuj.pl/praca/test,oferta,1',
              title: 'Frontend Developer',
              company: 'Test Company',
              location: 'Remote',
              salary: null,
              employmentType: 'B2B',
              description: 'Build React experiences',
              requirements: ['React', 'TypeScript'],
              details: { benefits: ['Remote'] },
              createdAt: '2026-02-01T00:00:00.000Z',
            },
          ],
          total: 1,
          mode: 'strict',
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

  await page.goto('/opportunities', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible();
  await expect(page.getByText('Strong React fit for your current profile.').first()).toBeVisible();
  await expect(page.getByText('Save to pipeline')).toBeVisible();

  const statusRequest = page.waitForRequest('**/api/job-offers/ujo-1/status');
  await page.getByRole('button', { name: 'Save to pipeline' }).first().click();
  await statusRequest;
});
