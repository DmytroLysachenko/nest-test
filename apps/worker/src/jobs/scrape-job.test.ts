import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyScrapeOutcome } from '@repo/db';

import {
  assessNormalizedJobs,
  buildScrapeCallbackPayload,
  buildWorkerCallbackSignaturePayload,
  classifyScrapeError,
  classifyScrapeFailureReason,
  computeCallbackPayloadHash,
  computeCallbackRetryDelayMs,
  computeInitialDetailBudget,
  computeNormalizedJobContentHash,
  resolveScrapeCompletionDiagnostics,
  sanitizeCallbackJobs,
} from './scrape-job';

test('buildScrapeCallbackPayload emits completed callback fields', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'run-source-1',
    traceId: '11111111-1111-4111-8111-111111111111',
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
  assert.equal(payload.traceId, '11111111-1111-4111-8111-111111111111');
  assert.equal(payload.scrapedCount, 8);
  assert.equal(payload.totalFound, 14);
  assert.equal(payload.error, undefined);
  assert.equal(payload.diagnostics?.attemptCount, 2);
  assert.equal(payload.diagnostics?.adaptiveDelayApplied, 500);
});

test('buildScrapeCallbackPayload emits source quality diagnostics', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-3',
    source: 'pracuj-pl',
    runId: 'run-3',
    sourceRunId: 'run-source-3',
    listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
    status: 'COMPLETED',
    diagnostics: {
      resultKind: 'empty',
      emptyReason: 'filters_exhausted',
      sourceQuality: 'empty',
    },
  });

  assert.equal(payload.diagnostics?.resultKind, 'empty');
  assert.equal(payload.diagnostics?.emptyReason, 'filters_exhausted');
  assert.equal(payload.diagnostics?.sourceQuality, 'empty');
});

test('computeCallbackPayloadHash is deterministic for canonical payload shape', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'run-source-1',
    attemptNo: 2,
    emittedAt: '2026-03-03T10:00:00.000Z',
    listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
    status: 'COMPLETED',
    scrapedCount: 8,
    totalFound: 14,
    jobCount: 8,
    jobLinkCount: 14,
  });
  const reordered = {
    status: payload.status,
    sourceRunId: payload.sourceRunId,
    eventId: payload.eventId,
    runId: payload.runId,
    source: payload.source,
    attemptNo: payload.attemptNo,
    emittedAt: payload.emittedAt,
    listingUrl: payload.listingUrl,
    scrapedCount: payload.scrapedCount,
    totalFound: payload.totalFound,
    jobCount: payload.jobCount,
    jobLinkCount: payload.jobLinkCount,
  };

  assert.equal(computeCallbackPayloadHash(payload as Record<string, unknown>), computeCallbackPayloadHash(reordered));
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

test('classifyScrapeFailureReason maps browser bootstrap and navigation failures', () => {
  assert.equal(
    classifyScrapeFailureReason(new Error('browserType.launch: Timeout 60000ms exceeded')),
    'browser_bootstrap_failed',
  );
  assert.equal(classifyScrapeFailureReason(new Error('Cloudflare Just a moment...')), 'source_http_blocked');
  assert.equal(
    classifyScrapeFailureReason(new Error('page.goto: Navigation timeout exceeded')),
    'browser_navigation_failed',
  );
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

test('assessNormalizedJobs rejects placeholder and expired offers', () => {
  const assessed = assessNormalizedJobs([
    {
      source: 'pracuj-pl-it',
      sourceId: 'accepted-1',
      title: 'Frontend Developer',
      company: 'ACME',
      location: 'Remote',
      description: 'Build React and TypeScript user interfaces for a SaaS platform.',
      url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
      tags: [],
      salary: null,
      employmentType: 'B2B',
      requirements: ['React', 'TypeScript'],
    },
    {
      source: 'pracuj-pl-it',
      sourceId: 'rejected-1',
      title: 'Unknown title',
      company: 'ACME',
      location: 'Remote',
      description: 'Listing summary only',
      url: 'https://it.pracuj.pl/praca/frontend,oferta,2',
      tags: [],
      salary: null,
      employmentType: 'B2B',
      requirements: [],
    },
    {
      source: 'pracuj-pl-it',
      sourceId: 'rejected-2',
      title: 'Expired Role',
      company: 'ACME',
      location: 'Remote',
      description: 'Legacy offer that should not be linked.',
      url: 'https://it.pracuj.pl/praca/frontend,oferta,3',
      tags: [],
      salary: null,
      employmentType: 'B2B',
      requirements: [],
      isExpired: true,
    },
  ]);

  assert.equal(assessed.acceptedOfferCount, 1);
  assert.equal(assessed.rejectedOfferCount, 2);
  assert.equal(assessed.rejectedOfferReasons.placeholder_title, 1);
  assert.equal(assessed.rejectedOfferReasons.expired_offer, 1);
});

test('computeNormalizedJobContentHash is deterministic for stable offer payload', () => {
  const hashA = computeNormalizedJobContentHash({
    sourceId: '123',
    url: 'https://it.pracuj.pl/praca/frontend,oferta,123',
    title: 'Frontend Developer',
    company: 'ACME',
    location: 'Remote',
    description: 'React and TypeScript role',
    salary: '20k',
    employmentType: 'B2B',
    requirements: ['React', 'TypeScript'],
    details: { seniority: 'senior' },
  });
  const hashB = computeNormalizedJobContentHash({
    sourceId: '123',
    url: 'https://it.pracuj.pl/praca/frontend,oferta,123',
    title: 'Frontend Developer',
    company: 'ACME',
    location: 'Remote',
    description: 'React and TypeScript role',
    salary: '20k',
    employmentType: 'B2B',
    requirements: ['React', 'TypeScript'],
    details: { seniority: 'senior' },
  });

  assert.equal(hashA, hashB);
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

test('classifyScrapeOutcome distinguishes partial, empty, blocked, and callback failures', () => {
  assert.equal(
    classifyScrapeOutcome({
      status: 'COMPLETED',
      resultKind: 'blocked',
      scrapedCount: 3,
    }),
    'partial_success',
  );
  assert.equal(
    classifyScrapeOutcome({
      status: 'COMPLETED',
      resultKind: 'blocked',
      scrapedCount: 0,
    }),
    'blocked_by_source',
  );
  assert.equal(
    classifyScrapeOutcome({
      status: 'COMPLETED',
      resultKind: 'empty',
      emptyReason: 'filters_exhausted',
      scrapedCount: 0,
    }),
    'filters_exhausted',
  );
  assert.equal(
    classifyScrapeOutcome({
      status: 'FAILED',
      failureType: 'callback',
    }),
    'callback_rejected',
  );
  assert.equal(
    classifyScrapeOutcome({
      status: 'FAILED',
      failureType: 'network',
      failureReason: 'browser_bootstrap_failed',
    }),
    'browser_bootstrap_failed',
  );
});

test('resolveScrapeCompletionDiagnostics marks partial blocked runs as degraded partial success', () => {
  const result = resolveScrapeCompletionDiagnostics({
    sanitizedCount: 3,
    jobLinkCount: 8,
    blockedUrlCount: 3,
    hadZeroOffersStep: false,
    rejectedOfferCount: 0,
  });

  assert.equal(result.blockedRate, 0.375);
  assert.equal(result.silentFailure, false);
  assert.equal(result.resultKind, 'blocked');
  assert.equal(result.emptyReason, null);
  assert.equal(result.sourceQuality, 'degraded');
});

test('resolveScrapeCompletionDiagnostics distinguishes detail parse gaps from source blocking', () => {
  const parseGap = resolveScrapeCompletionDiagnostics({
    sanitizedCount: 0,
    jobLinkCount: 6,
    blockedUrlCount: 1,
    hadZeroOffersStep: false,
    rejectedOfferCount: 0,
  });
  const blocked = resolveScrapeCompletionDiagnostics({
    sanitizedCount: 0,
    jobLinkCount: 6,
    blockedUrlCount: 6,
    hadZeroOffersStep: false,
    rejectedOfferCount: 0,
  });

  assert.equal(parseGap.resultKind, 'empty');
  assert.equal(parseGap.silentFailure, true);
  assert.equal(parseGap.emptyReason, 'detail_parse_gap');
  assert.equal(parseGap.sourceQuality, 'degraded');
  assert.equal(blocked.resultKind, 'blocked');
  assert.equal(blocked.silentFailure, false);
  assert.equal(blocked.emptyReason, null);
  assert.equal(blocked.sourceQuality, 'degraded');
});

test('computeInitialDetailBudget caps first attempt detail work to remaining task time', () => {
  const budget = computeInitialDetailBudget({
    requestedLimit: 20,
    targetWindow: { min: 20, max: 40 },
    scrapeTimeoutMs: 180000,
    elapsedMs: 83000,
  });

  assert.equal(budget, 4);
});

test('computeInitialDetailBudget reserves more time when browser fallback delays are higher', () => {
  const budget = computeInitialDetailBudget({
    requestedLimit: 20,
    targetWindow: { min: 20, max: 40 },
    scrapeTimeoutMs: 180000,
    elapsedMs: 46000,
    detailDelayMs: 4000,
    browserFallbackCooldownMs: 7000,
  });

  assert.equal(budget, 4);
});

test('computeInitialDetailBudget does not exceed requested limit on fast runs', () => {
  const budget = computeInitialDetailBudget({
    requestedLimit: 3,
    targetWindow: { min: 20, max: 40 },
    scrapeTimeoutMs: 180000,
    elapsedMs: 5000,
  });

  assert.equal(budget, 3);
});
