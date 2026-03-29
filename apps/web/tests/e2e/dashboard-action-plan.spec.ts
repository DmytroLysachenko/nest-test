import { expect, test } from '@playwright/test';

test('dashboard renders the action plan and links into notebook focus', async ({ page }) => {
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
            saved: 2,
            applied: 1,
            interviewing: 0,
            offersMade: 0,
            rejected: 0,
            followUpDue: 1,
            lastUpdatedAt: '2026-02-01T00:00:00.000Z',
          },
          documents: { total: 1, ready: 1, pending: 0, failed: 0 },
          scrape: {
            lastRunStatus: 'COMPLETED',
            lastRunAt: '2026-02-01T00:00:00.000Z',
            lastRunProgress: null,
            totalRuns: 1,
          },
          workflow: { needsOnboarding: false },
          nextAction: {
            key: 'triage-notebook',
            title: 'Review notebook',
            description: 'Handle due follow-ups first.',
            href: '/notebook?focus=followUpDue',
            priority: 'recommended',
          },
          activity: [],
          health: {
            readinessScore: 100,
            blockers: [],
            scrapeReliability: 'stable',
          },
          readinessBreakdown: [],
          blockerDetails: [],
          recommendedSequence: ['planning', 'notebook'],
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
          targetRoles: ['Frontend Engineer'],
          desiredLocations: ['Remote'],
          notes: 'Playwright dashboard fixture',
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
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
          version: 1,
          status: 'READY',
          headline: 'Senior Frontend Engineer',
          summary: 'Ready profile for dashboard bootstrapping.',
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          isActive: true,
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
            type: 'CV',
            storagePath: 'documents/doc-1.pdf',
            originalName: 'resume.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            extractionStatus: 'READY',
            createdAt: '2026-02-01T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      }),
    });
  });

  await page.route('**/api/job-offers/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total: 4,
          scored: 3,
          saved: 2,
          applied: 1,
          interviewing: 0,
          offersMade: 0,
          rejected: 0,
          followUpDue: 1,
          lastUpdatedAt: '2026-02-01T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/job-offers/action-plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          buckets: [
            {
              key: 'due-now',
              label: 'Due now',
              description: 'Handle overdue follow-ups before you review new leads.',
              href: '/notebook?focus=followUpDue',
              count: 1,
              ctaLabel: 'Open due follow-ups',
              reasons: ['overdue follow-ups are blocking active pipeline work'],
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/job-offers/focus', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { groups: [] } }),
    });
  });

  await page.route('**/api/job-offers?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          items: [],
          total: 0,
          mode: 'strict',
          hiddenByModeCount: 0,
          degradedResultCount: 0,
        },
      }),
    });
  });

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

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Today', { exact: true })).toBeVisible();
  await expect(page.getByText('Due now')).toBeVisible();

  const actionLink = page.getByRole('link', { name: /Due now/i }).first();
  await expect(actionLink).toHaveAttribute('href', '/notebook?focus=followUpDue');
  await expect(page.getByText('Open due follow-ups')).toBeVisible();
});
