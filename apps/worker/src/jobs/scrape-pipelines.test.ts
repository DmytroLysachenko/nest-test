import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeParsedJobsWithListingSalvage, runFetchStage, runNormalizeStage, runParseStage } from './scrape-pipelines';

type TestPipeline = Parameters<typeof runFetchStage>[0];

const createAdapter = (events: string[]): TestPipeline => ({
  id: 'pracuj-pl',
  defaultListingUrl: 'https://example.com',
  buildListingUrl: () => 'https://example.com',
  normalizeSource: 'fake-source',
  transportPolicy: 'http',
  fetch: async () => {
    events.push('fetch');
    return {
      pages: [{ url: 'https://example.com/1', html: '<html></html>' }],
      jobLinks: [],
      recommendedJobLinks: [],
      blockedUrls: [],
      listingSummaries: [],
      skippedUrls: [],
      detailDiagnostics: [],
      hasZeroOffers: false,
      detailAttemptedCount: 0,
      detailBudget: null,
      browserFallbackCount: 0,
      browserFallbackBudgetMs: null,
      browserFallbackBudgetUsedMs: 0,
      browserFallbackBudgetRemainingMs: null,
      detailStopReason: 'completed',
    };
  },
  parse: () => {
    events.push('parse');
    return [];
  },
  normalize: () => {
    events.push('normalize');
    return [];
  },
});

test('pipeline stages use the resolved adapter implementation', async () => {
  const events: string[] = [];
  const adapter = createAdapter(events);

  const crawlResult = await runFetchStage(adapter, {
    headless: true,
    listingUrl: 'https://example.com',
    logger: undefined,
  });
  runParseStage(adapter, crawlResult);
  runNormalizeStage(adapter, [], adapter.normalizeSource);

  assert.deepEqual(events, ['fetch', 'parse', 'normalize']);
});

test('listing salvage is limited to discovered primary links and skips parsed duplicates', () => {
  const parsed = [
    {
      title: 'Parsed Frontend',
      description: 'Detailed parsed offer',
      url: 'https://www.pracuj.pl/praca/frontend,oferta,100',
      sourceId: '100',
    },
  ];
  const summaries = [
    {
      title: 'Parsed Frontend',
      url: 'https://www.pracuj.pl/praca/frontend,oferta,100',
      sourceId: '100',
      company: 'A',
    },
    {
      title: 'Discovered Backend',
      url: 'https://www.pracuj.pl/praca/backend,oferta,200',
      sourceId: '200',
      company: 'B',
    },
    {
      title: 'Recommended Noise',
      url: 'https://www.pracuj.pl/praca/noise,oferta,300',
      sourceId: '300',
      company: 'C',
    },
  ];

  const merged = mergeParsedJobsWithListingSalvage(parsed, summaries, [
    'https://www.pracuj.pl/praca/frontend,oferta,100',
    'https://www.pracuj.pl/praca/backend,oferta,200',
  ]);

  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.map((job) => job.sourceId),
    ['100', '200'],
  );
  assert.equal(merged[1]?.tags?.includes('listing-salvage'), true);
});
