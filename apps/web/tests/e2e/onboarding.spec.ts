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

  await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Build your job-search profile')).toBeVisible();

  await page.getByPlaceholder('e.g. Frontend Developer, Software Engineer').fill('Frontend Developer');
  await page.getByPlaceholder('e.g. Frontend Developer, Software Engineer').press('Enter');
  await page.getByPlaceholder('e.g. React, TypeScript, Node.js').fill('TypeScript');
  await page.getByPlaceholder('e.g. React, TypeScript, Node.js').press('Enter');
  await page.getByPlaceholder('e.g. React, TypeScript, Node.js').fill('React');
  await page.getByPlaceholder('e.g. React, TypeScript, Node.js').press('Enter');
  await page.getByPlaceholder('e.g. React, TypeScript, Node.js').fill('Next.js');
  await page.getByPlaceholder('e.g. React, TypeScript, Node.js').press('Enter');

  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await expect(page.getByText('Step 2: Source Documents')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to review' }).click();
  await expect(page.getByText('Step 3: Review & Generate')).toBeVisible();

  const saveRequest = page.waitForRequest('**/api/profile-inputs');
  const generateRequest = page.waitForRequest('**/api/career-profiles');
  await page.getByRole('button', { name: 'Generate Profile' }).click();
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

  await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/Backend Developer/)).toBeVisible();
  await expect(page.getByText(/Node\.js/)).toBeVisible();
});

test('onboarding keeps step-one values after reload via local draft persistence', async ({ page }) => {
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
      body: JSON.stringify({ success: true, data: { id: 'draft-1', payload: {} } }),
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
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('e.g. Frontend Developer, Software Engineer').fill('Data Engineer');
  await page.getByPlaceholder('e.g. Frontend Developer, Software Engineer').press('Enter');
  await page.getByLabel('General Notes').fill('Need roles with data platform ownership.');
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/Data Engineer/)).toBeVisible();
  await expect(page.getByLabel('General Notes')).toHaveValue('Need roles with data platform ownership.');
});
