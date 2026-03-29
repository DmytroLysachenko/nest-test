import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSalvagedListingJobs,
  mergeParsedJobsWithListingSalvage,
  runNormalizeStage,
  runParseStage,
  runPostProcessStage,
} from './scrape-pipelines';

test('buildSalvagedListingJobs keeps only high-confidence listing summaries and tags them as degraded', () => {
  const jobs = buildSalvagedListingJobs([
    {
      url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
      title: 'Frontend Developer',
      company: 'ACME',
      description: 'React role with modern TypeScript stack.',
      sourceId: '1001',
    },
    {
      url: 'https://it.pracuj.pl/praca/frontend,oferta,2',
      title: '',
      description: 'Missing title should be dropped.',
    },
    {
      url: 'https://it.pracuj.pl/praca/frontend,oferta,3',
      title: 'Backend Developer',
    },
  ]);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.title, 'Frontend Developer');
  assert.deepEqual(jobs[0]?.tags, ['listing-salvage', 'degraded-source']);
  assert.equal(jobs[0]?.description, 'React role with modern TypeScript stack.');
});

test('mergeParsedJobsWithListingSalvage keeps parsed jobs and appends unseen salvageable summaries', () => {
  const jobs = mergeParsedJobsWithListingSalvage(
    [
      {
        title: 'Frontend Developer',
        company: 'ACME',
        description: 'Detailed description from detail page.',
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1?ref=detail',
      },
    ],
    [
      {
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
        title: 'Frontend Developer',
        company: 'ACME',
        description: 'Listing summary version.',
      },
      {
        url: 'https://it.pracuj.pl/praca/backend,oferta,2',
        title: 'Backend Developer',
        company: 'Globex',
        description: 'Strong listing summary for backend role.',
      },
    ],
  );

  assert.equal(jobs.length, 2);
  assert.equal(jobs[0]?.title, 'Frontend Developer');
  assert.equal(jobs[1]?.title, 'Backend Developer');
  assert.deepEqual(jobs[1]?.tags, ['listing-salvage', 'degraded-source']);
});

test('mergeParsedJobsWithListingSalvage excludes URLs skipped as fresh cache hits', () => {
  const jobs = mergeParsedJobsWithListingSalvage(
    [],
    [
      {
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
        title: 'Frontend Developer',
        company: 'ACME',
        description: 'Listing summary version.',
      },
    ],
    ['https://it.pracuj.pl/praca/frontend,oferta,1'],
  );

  assert.equal(jobs.length, 0);
});

test('runParseStage returns empty when no detail pages were fetched', () => {
  const parsed = runParseStage({
    pages: [],
    blockedUrls: [],
    jobLinks: [],
    skippedUrls: [],
    recommendedJobLinks: [],
    hasZeroOffers: false,
    listingHtml: '<html></html>',
    listingData: null,
    listingSummaries: [],
    detailDiagnostics: [],
    detailAttemptedCount: 0,
    detailBudget: null,
    detailStopReason: 'completed',
  });

  assert.deepEqual(parsed, []);
});

test('runPostProcessStage keeps listing-only mode empty and otherwise merges salvage', () => {
  const crawlResult = {
    pages: [],
    blockedUrls: [],
    jobLinks: ['https://it.pracuj.pl/praca/frontend,oferta,1'],
    skippedUrls: [],
    recommendedJobLinks: [],
    hasZeroOffers: false,
    listingHtml: '<html></html>',
    listingData: null,
    listingSummaries: [
      {
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
        title: 'Frontend Developer',
        description: 'Recovered from listing',
      },
    ],
    detailDiagnostics: [],
    detailAttemptedCount: 0,
    detailBudget: null,
    detailStopReason: 'completed' as const,
  };

  assert.deepEqual(runPostProcessStage([], crawlResult, true), []);
  const merged = runPostProcessStage([], crawlResult, false);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.title, 'Frontend Developer');
});

test('runNormalizeStage converts parsed jobs into source-normalized jobs', () => {
  const normalized = runNormalizeStage(
    [
      {
        title: 'Frontend Developer',
        company: 'ACME',
        description: 'React and TypeScript role',
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
        requirements: ['React'],
      },
    ],
    'pracuj-pl-it',
  );

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]?.source, 'pracuj-pl-it');
  assert.equal(normalized[0]?.title, 'Frontend Developer');
});
