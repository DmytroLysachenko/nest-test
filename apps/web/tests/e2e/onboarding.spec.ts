import { expect, test } from '@playwright/test';

test('onboarding flow saves structured input and triggers generation', async ({ page }) => {
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
          email: 'user@example.com',
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
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 'draft-1', payload: route.request().postDataJSON()?.payload ?? {} },
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

  await page.route('**/api/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{ id: 'doc-1', extractionStatus: 'READY', originalName: 'cv.pdf', type: 'CV' }],
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
          id: 'pi-1',
          targetRoles: 'Frontend Developer',
          notes: 'Remote',
          intakePayload: { desiredPositions: ['Frontend Developer'] },
        },
      }),
    });
  });

  await page.route('**/api/career-profiles', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'cp-1',
          status: 'READY',
          version: 1,
          isActive: true,
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
          profile: { exists: true, status: 'READY', version: 1, updatedAt: null },
          profileInput: { exists: true, updatedAt: null },
          offers: { total: 0, scored: 0, lastUpdatedAt: null },
          scrape: { lastRunStatus: null, lastRunAt: null, totalRuns: 0 },
          workflow: { needsOnboarding: false },
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

  await page.goto('/app/onboarding', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Build your job-search profile')).toBeVisible();

  await page.getByPlaceholder('e.g. Frontend Developer').fill('Frontend Developer');
  await page.getByPlaceholder('e.g. Frontend Developer').press('Enter');
  await page.getByPlaceholder('e.g. TypeScript').fill('TypeScript');
  await page.getByPlaceholder('e.g. TypeScript').press('Enter');
  await page.getByPlaceholder('e.g. TypeScript').fill('React');
  await page.getByPlaceholder('e.g. TypeScript').press('Enter');
  await page.getByPlaceholder('e.g. TypeScript').fill('Next.js');
  await page.getByPlaceholder('e.g. TypeScript').press('Enter');

  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await expect(page.getByText('Step 2: Upload CV / LinkedIn export')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to review' }).click();
  await expect(page.getByText('Step 3: Review and generate profile')).toBeVisible();

  const saveRequest = page.waitForRequest('**/api/profile-inputs');
  const generateRequest = page.waitForRequest('**/api/career-profiles');
  await page.getByRole('button', { name: 'Generate profile and open dashboard' }).click();
  const intakePayload = (await saveRequest).postDataJSON();
  expect(Array.isArray(intakePayload.intakePayload?.desiredPositions)).toBeTruthy();
  await generateRequest;
});

test('onboarding loads server draft into form', async ({ page }) => {
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
        data: { id: 'user-1', email: 'user@example.com' },
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

  await page.route('**/api/onboarding/draft', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'draft-1',
            payload: {
              desiredPositions: ['Backend Developer'],
              coreSkills: ['Node.js', 'TypeScript', 'PostgreSQL'],
              jobDomains: ['IT'],
              experienceYearsInRole: 4,
              targetSeniority: ['mid'],
              hardWorkModes: ['remote'],
              softWorkModes: ['hybrid'],
              hardContractTypes: ['uop'],
              softContractTypes: ['b2b'],
              sectionNotes: { positions: '', domains: '', skills: '', experience: '', preferences: '' },
              generalNotes: '',
            },
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'draft-1', payload: {} } }),
    });
  });

  await page.goto('/app/onboarding', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: 'Load server draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Load server draft' }).click();
  await expect(page.getByText('Backend Developer ×')).toBeVisible();
});
