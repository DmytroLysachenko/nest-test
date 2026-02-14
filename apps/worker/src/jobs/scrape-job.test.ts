import assert from 'node:assert/strict';
import test from 'node:test';

import { buildScrapeCallbackPayload, classifyScrapeError } from './scrape-job';

test('buildScrapeCallbackPayload emits completed callback fields', () => {
  const payload = buildScrapeCallbackPayload({
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'run-source-1',
    listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
    status: 'COMPLETED',
    scrapedCount: 8,
    totalFound: 14,
    jobCount: 8,
    jobLinkCount: 14,
  });

  assert.equal(payload.status, 'COMPLETED');
  assert.equal(payload.scrapedCount, 8);
  assert.equal(payload.totalFound, 14);
  assert.equal(payload.error, undefined);
});

test('buildScrapeCallbackPayload emits failure callback fields', () => {
  const payload = buildScrapeCallbackPayload({
    source: 'pracuj-pl',
    runId: 'run-2',
    sourceRunId: 'run-source-2',
    listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
    status: 'FAILED',
    error: 'Cloudflare blocked request',
  });

  assert.equal(payload.status, 'FAILED');
  assert.equal(payload.error, 'Cloudflare blocked request');
  assert.equal(payload.scrapedCount, undefined);
});

test('classifyScrapeError maps timeout errors', () => {
  const timeoutError = new Error('Scrape timed out after 120000ms');
  timeoutError.name = 'ScrapeTimeoutError';
  assert.equal(classifyScrapeError(timeoutError), 'timeout');
});

test('classifyScrapeError maps callback errors', () => {
  assert.equal(classifyScrapeError(new Error('Callback rejected (401): unauthorized')), 'callback');
});

test('classifyScrapeError maps network errors', () => {
  assert.equal(classifyScrapeError(new Error('Cloudflare blocked request')), 'network');
});
