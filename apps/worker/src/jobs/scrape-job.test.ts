import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScrapeCallbackPayload,
  buildWorkerCallbackSignaturePayload,
  classifyScrapeError,
  computeCallbackRetryDelayMs,
  sanitizeCallbackJobs,
} from './scrape-job';

test('buildScrapeCallbackPayload emits completed callback fields', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'run-source-1',
    listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
    status: 'COMPLETED',
    scrapedCount: 8,
    totalFound: 14,
    jobCount: 8,
    jobLinkCount: 14,
    diagnostics: {
      attemptCount: 2,
      adaptiveDelayApplied: 500,
      blockedRate: 0.25,
      finalPolicy: 'adaptive-delay:2500',
    },
  });

  assert.equal(payload.status, 'COMPLETED');
  assert.equal(payload.scrapedCount, 8);
  assert.equal(payload.totalFound, 14);
  assert.equal(payload.error, undefined);
  assert.equal(payload.diagnostics?.attemptCount, 2);
  assert.equal(payload.diagnostics?.adaptiveDelayApplied, 500);
});

test('buildScrapeCallbackPayload emits failure callback fields', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-2',
    source: 'pracuj-pl',
    runId: 'run-2',
    sourceRunId: 'run-source-2',
    listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
    status: 'FAILED',
    error: 'Cloudflare blocked request',
    failureType: 'network',
    failureCode: 'WORKER_NETWORK',
  });

  assert.equal(payload.status, 'FAILED');
  assert.equal(payload.error, 'Cloudflare blocked request');
  assert.equal(payload.failureType, 'network');
  assert.equal(payload.failureCode, 'WORKER_NETWORK');
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

test('sanitizeCallbackJobs removes invalid entries and deduplicates by canonical identity', () => {
  const sanitized = sanitizeCallbackJobs([
    {
      source: 'pracuj-pl-it',
      sourceId: '1',
      title: ' Backend Developer ',
      company: ' ACME ',
      location: ' Gdynia ',
      description: ' Build APIs ',
      url: ' https://it.pracuj.pl/praca/test,oferta,1 ',
      tags: [' backend ', 'backend', ''],
      salary: ' 10k ',
      employmentType: ' B2B ',
      requirements: [' TypeScript ', 'TypeScript', ''],
    },
    {
      source: 'pracuj-pl-it',
      sourceId: '1',
      title: 'Backend Dev Duplicate',
      company: null,
      location: null,
      description: 'Duplicate by URL should be ignored',
      url: 'https://it.pracuj.pl/praca/test?ref=feed,oferta,1',
      tags: [],
      salary: null,
      employmentType: null,
      requirements: [],
    },
    {
      source: 'pracuj-pl-it',
      sourceId: null,
      title: 'Missing URL',
      company: null,
      location: null,
      description: 'invalid',
      url: '',
      tags: [],
      salary: null,
      employmentType: null,
      requirements: [],
    },
  ]);

  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0]?.url, 'https://it.pracuj.pl/praca/test,oferta,1');
  assert.deepEqual(sanitized[0]?.tags, ['backend']);
  assert.deepEqual(sanitized[0]?.requirements, ['TypeScript']);
});

test('buildWorkerCallbackSignaturePayload is deterministic', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'source-run-1',
    listingUrl: 'https://it.pracuj.pl/praca',
    status: 'COMPLETED',
  });

  const result = buildWorkerCallbackSignaturePayload(payload, 'req-1', 1700000000);
  assert.equal(result, '1700000000.source-run-1.COMPLETED.run-1.req-1.event-1');
});

test('computeCallbackRetryDelayMs applies exponential backoff without jitter', () => {
  assert.equal(computeCallbackRetryDelayMs(1, 500, 10_000, 0), 500);
  assert.equal(computeCallbackRetryDelayMs(2, 500, 10_000, 0), 1000);
  assert.equal(computeCallbackRetryDelayMs(3, 500, 10_000, 0), 2000);
  assert.equal(computeCallbackRetryDelayMs(10, 500, 10_000, 0), 10_000);
});

test('computeCallbackRetryDelayMs applies bounded jitter', () => {
  assert.equal(computeCallbackRetryDelayMs(2, 1000, 10_000, 0.2, 0), 1600);
  assert.equal(computeCallbackRetryDelayMs(2, 1000, 10_000, 0.2, 1), 2400);
  assert.equal(computeCallbackRetryDelayMs(2, 1000, 10_000, 0.2, 0.5), 2000);
});
