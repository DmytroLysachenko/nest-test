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

  await page.route('**/api/job-sources/scrape', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ok: true,
          sourceRunId: 'run-2',
          status: 'accepted',
          acceptedAt: '2026-02-01T00:00:00.000Z',
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
              status: 'APPLIED',
              matchScore: 62,
              rankingScore: 62,
              followUpState: 'due',
              explanationTags: ['hard_constraints_ok', 'seniority_match', 'skill_partial'],
              matchMeta: { summary: 'Good backend match' },
              pipelineMeta: {
                followUpAt: '2026-02-03T09:30:00.000Z',
                nextStep: 'Send follow-up email',
                followUpNote: 'Mention portfolio refresh and API design case study.',
                applicationUrl: 'https://example.com/application/123',
                contactName: 'Ava Recruiter',
              },
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
            total: 1,
            scored: 1,
            saved: 0,
            applied: 0,
            interviewing: 0,
            offersMade: 0,
            rejected: 0,
            followUpDue: 0,
            lastUpdatedAt: '2026-02-01T00:00:00.000Z',
          },
          documents: {
            total: 1,
            ready: 1,
            pending: 0,
            failed: 0,
          },
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
            description: 'Triage the newest opportunities first.',
            href: '/notebook',
            priority: 'info',
          },
          activity: [],
          health: {
            readinessScore: 100,
            blockers: [],
            scrapeReliability: 'stable',
          },
          readinessBreakdown: [],
          blockerDetails: [],
          recommendedSequence: ['profile-input', 'documents', 'career-profile'],
        },
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
          total: 1,
          scored: 1,
          unscored: 0,
          highConfidenceStrict: 1,
          staleUntriaged: 0,
          followUpDue: 0,
          followUpUpcoming: 0,
          buckets: [{ key: 'saved', label: 'Saved', count: 0 }],
          topExplanationTags: [{ tag: 'hard_constraints_ok', count: 1 }],
          quickActions: [{ key: 'strictTop', label: 'Strict top', count: 1, href: '/notebook?focus=strictTop' }],
        },
      }),
    });
  });

  await page.route('**/api/job-offers/focus', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          groups: [
            {
              key: 'follow-up-due',
              label: 'Follow-up due',
              description: 'Handle overdue follow-ups before widening the funnel.',
              href: '/notebook?focus=followUpDue',
              count: 1,
              items: [
                {
                  id: 'ujo-1',
                  title: 'Backend Developer',
                  company: 'Test Company',
                  location: 'Gdynia',
                  matchScore: 62,
                  followUpState: 'due',
                },
              ],
            },
            {
              key: 'applied-active',
              label: 'Applied pipeline',
              description: 'Keep active applications moving with interview prep and next-step tracking.',
              href: '/notebook?focus=applied',
              count: 1,
              items: [],
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/job-offers/pipeline/bulk-follow-up', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          updated: 1,
          summary: {
            due: 0,
            upcoming: 1,
            none: 0,
            noteApplied: true,
            nextStepApplied: true,
          },
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

  await page.goto('/notebook', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Job Notebook')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Backend Developer')).toBeVisible();
  await expect(page.getByLabel('Mode')).toHaveValue('strict');

  const scrapeRequest = page.waitForRequest('**/api/job-sources/scrape');
  await page.getByRole('button', { name: 'Sync via Profile' }).click();
  const scrapePayload = (await scrapeRequest).postDataJSON();
  expect(scrapePayload).toEqual({ limit: 20 });

  await page
    .getByRole('button', { name: /Backend Developer/ })
    .first()
    .click();

  await expect(page.getByText('Follow-up plan', { exact: true })).toBeVisible();
  await expect(page.getByText('Next step: Send follow-up email').first()).toBeVisible();

  await page.getByLabel('Select Backend Developer').check();
  await page.getByRole('button', { name: 'Edit bulk plan' }).click();
  await page.getByLabel('Bulk next step').fill('Prepare recruiter follow-up');
  await page.getByLabel('Bulk follow-up note').fill('Share updated portfolio link');
  const bulkFollowUpRequest = page.waitForRequest('**/api/job-offers/pipeline/bulk-follow-up');
  await page.getByRole('button', { name: 'Save bulk follow-up' }).click();
  await bulkFollowUpRequest;

  const statusRequest = page.waitForRequest('**/api/job-offers/ujo-1/status');
  await page.getByRole('button', { name: 'SAVED' }).first().click();
  await statusRequest;

  await page.getByLabel('Notes', { exact: true }).fill('smoke note');
  await page.getByLabel('Tags (comma separated)').fill('smoke, backend');

  const metaRequest = page.waitForRequest('**/api/job-offers/ujo-1/meta');
  await page.getByRole('button', { name: 'Save notes and tags' }).click();
  await metaRequest;

  const scoreRequest = page.waitForRequest('**/api/job-offers/ujo-1/score');
  await page.getByRole('button', { name: 'Re-score' }).click();
  await scoreRequest;
});
