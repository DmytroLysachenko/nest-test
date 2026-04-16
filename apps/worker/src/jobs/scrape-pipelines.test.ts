import assert from 'node:assert/strict';
import test from 'node:test';

import { runFetchStage, runNormalizeStage, runParseStage } from './scrape-pipelines';

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
