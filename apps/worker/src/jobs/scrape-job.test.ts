import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyScrapeOutcome } from '@repo/db';

import {
  assessNormalizedJobs,
  buildScrapeOfferBatchIngestPayload,
  buildScrapeCallbackPayload,
  buildScrapeOfferIngestPayload,
  buildWorkerCallbackSignaturePayload,
  classifyScrapeError,
  classifyScrapeFailureReason,
  computeCallbackPayloadHash,
  computeCallbackRetryDelayMs,
  computeInitialDetailBudget,
  computeNormalizedJobContentHash,
  resolveEffectiveScrapeTiming,
  resolveScrapeFailureCode,
  resolveScrapeCompletionDiagnostics,
  resolveScrapeStopReason,
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
      stopReason: 'detail_budget_exhausted',
      stageRetryCounts: {
        listingHttpRetries: 1,
        browserLaunchRetries: 0,
        detailFallbacks: 2,
        callbackRetries: 0,
        callbackDispatchFailures: 0,
      },
    },
  });

  assert.equal(payload.status, 'COMPLETED');
  assert.equal(payload.traceId, '11111111-1111-4111-8111-111111111111');
  assert.equal(payload.scrapedCount, 8);
  assert.equal(payload.totalFound, 14);
  assert.equal(payload.error, undefined);
  assert.equal(payload.diagnostics?.attemptCount, 2);
  assert.equal(payload.diagnostics?.adaptiveDelayApplied, 500);
  assert.equal(payload.diagnostics?.stopReason, 'detail_budget_exhausted');
  assert.equal(payload.diagnostics?.stageRetryCounts?.detailFallbacks, 2);
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
    jobs: payload.jobs,
    diagnostics: payload.diagnostics,
  };

  assert.equal(computeCallbackPayloadHash(payload as Record<string, unknown>), computeCallbackPayloadHash(reordered));
});

test('computeCallbackPayloadHash ignores delivery attempt metadata', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'run-source-1',
    scrapeAttemptNo: 2,
    callbackAttemptNo: 1,
    attemptNo: 2,
    emittedAt: '2026-03-03T10:00:00.000Z',
    listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
    status: 'COMPLETED',
    scrapedCount: 8,
  });
  const retryPayload = {
    ...payload,
    callbackAttemptNo: 3,
    attemptNo: 3,
    emittedAt: '2026-03-03T10:00:05.000Z',
  };

  assert.equal(
    computeCallbackPayloadHash(payload as Record<string, unknown>),
    computeCallbackPayloadHash(retryPayload as Record<string, unknown>),
  );
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

test('resolveScrapeStopReason emits stable stage stop codes', () => {
  assert.equal(resolveScrapeStopReason({ detailStopReason: 'budget_reached' }), 'detail_budget_exhausted');
  assert.equal(resolveScrapeStopReason({ failureReason: 'browser_bootstrap_failed' }), 'browser_bootstrap_failed');
  assert.equal(resolveScrapeStopReason({ failureType: 'callback' }), 'callback_dispatch_exhausted');
  assert.equal(resolveScrapeStopReason({ failureType: 'timeout' }), 'detail_timeout');
});

test('resolveScrapeFailureCode maps failure reason into stable callback code', () => {
  assert.equal(
    resolveScrapeFailureCode({ failureType: 'network', failureReason: 'source_http_blocked' }),
    'SCRAPE_LISTING_HTTP_BLOCKED',
  );
  assert.equal(resolveScrapeFailureCode({ failureType: 'callback' }), 'SCRAPE_CALLBACK_DISPATCH_EXHAUSTED');
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

test('buildScrapeOfferIngestPayload emits incremental offer fields', () => {
  const payload = buildScrapeOfferIngestPayload({
    eventId: 'event-ingest-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'source-run-1',
    attemptNo: 2,
    emittedAt: '2026-04-04T08:00:00.000Z',
    job: {
      source: 'pracuj-pl-it',
      sourceId: '123',
      title: 'Backend Engineer',
      company: 'ACME',
      location: 'Remote',
      description: 'Build services.',
      url: 'https://it.pracuj.pl/praca/backend,oferta,123',
      tags: [],
      salary: null,
      employmentType: 'B2B',
      requirements: ['TypeScript'],
    },
  });

  assert.equal(payload.eventId, 'event-ingest-1');
  assert.equal(payload.job.title, 'Backend Engineer');
  assert.equal(payload.attemptNo, 2);
});

test('buildScrapeOfferBatchIngestPayload emits batch incremental offer fields', () => {
  const payload = buildScrapeOfferBatchIngestPayload({
    eventId: 'event-ingest-batch-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: 'source-run-1',
    taskId: 'task-1',
    dedupeKey: 'dedupe-1',
    pipelineAttemptNo: 2,
    emittedAt: '2026-04-04T08:00:00.000Z',
    jobs: [
      {
        source: 'pracuj-pl-it',
        sourceId: '123',
        title: 'Backend Engineer',
        company: 'ACME',
        location: 'Remote',
        description: 'Build services.',
        url: 'https://it.pracuj.pl/praca/backend,oferta,123',
        tags: [],
        salary: null,
        employmentType: 'B2B',
        requirements: ['TypeScript'],
      },
    ],
  });

  assert.equal(payload.eventId, 'event-ingest-batch-1');
  assert.equal(payload.taskId, 'task-1');
  assert.equal(payload.pipelineAttemptNo, 2);
  assert.equal(payload.jobs.length, 1);
});

test('buildScrapeOfferBatchIngestPayload strips invalid batch drift fields and passes API DTO validation', () => {
  const payload = buildScrapeOfferBatchIngestPayload({
    eventId: 'event-ingest-batch-2',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: '00000000-0000-4000-8000-000000000001',
    taskId: 'task-1',
    dedupeKey: 'dedupe-1',
    pipelineAttemptNo: 2,
    callbackAttemptNo: 1,
    attemptNo: 2,
    emittedAt: '2026-04-04T08:00:00.000Z',
    jobs: [
      {
        source: 'pracuj-pl-it',
        sourceId: '123',
        title: 'Backend Engineer',
        company: 'ACME',
        location: 'Remote',
        description: 'Build services.',
        url: 'https://it.pracuj.pl/praca/backend,oferta,123',
        tags: [' backend '],
        salary: null,
        employmentType: 'B2B',
        requirements: ['TypeScript'],
        isExpired: false,
        rawPayload: { some: 'value' },
        // @ts-expect-error runtime drift probe
        debugOnly: 'should-not-leak',
      },
    ],
  });

  assert.equal(payload.jobs[0]?.isExpired, false);
  assert.equal('debugOnly' in (payload.jobs[0] ?? {}), false);
});

test('buildScrapeCallbackPayload strips unsupported top-level diagnostics drift', () => {
  const payload = buildScrapeCallbackPayload({
    eventId: 'event-1',
    source: 'pracuj-pl',
    runId: 'run-1',
    sourceRunId: '00000000-0000-4000-8000-000000000002',
    traceId: '00000000-0000-4000-8000-000000000003',
    listingUrl: 'https://it.pracuj.pl/praca',
    status: 'COMPLETED',
    scrapedCount: 1,
    totalFound: 5,
    jobCount: 1,
    jobLinkCount: 5,
    jobs: [
      {
        source: 'pracuj-pl-it',
        sourceId: '123',
        title: 'Backend Engineer',
        company: 'ACME',
        location: 'Remote',
        description: 'Build services.',
        url: 'https://it.pracuj.pl/praca/backend,oferta,123',
        tags: [],
        salary: null,
        employmentType: 'B2B',
        requirements: ['TypeScript'],
        isExpired: false,
      },
    ],
    diagnostics: {
      pagesVisited: 3,
      jobLinksDiscovered: 5,
      detailAttemptedCount: 2,
      detailBatchCount: 9,
      detailConcurrencyRequested: 4,
      detailConcurrencyEffective: 2,
      browserFallbackConcurrency: 'serial',
      acceptedOfferCount: 1,
      rejectedOfferCount: 0,
      rejectedOfferReasons: {},
      stageMetrics: {
        fetch: {
          pagesVisited: 3,
          jobLinksDiscovered: 5,
          blockedPages: 0,
          browserFallbacks: 1,
          detailAttemptedCount: 2,
          detailBatchCount: 1,
          detailConcurrencyRequested: 4,
          detailConcurrencyEffective: 2,
          browserFallbackConcurrency: 'serial',
        },
        parse: {
          acceptedOfferCount: 1,
          rejectedOfferCount: 0,
          dedupedInRunCount: 0,
          uniqueDiscoveredOfferCount: 5,
          fullDetailOfferCount: 1,
          partialDetailOfferCount: 0,
          salvagedOfferCount: 0,
        },
        finalize: {
          blockedRate: 0,
          attemptCount: 1,
          stopReason: null,
          resultKind: 'healthy',
        },
      },
      blockedRate: 0,
      finalPolicy: 'strict',
      stopReason: 'completed',
      resultKind: 'healthy',
      emptyReason: null,
      sourceQuality: 'healthy',
      classifiedOutcome: 'success',
      stageRetryCounts: {
        listingHttpRetries: 0,
        browserLaunchRetries: 0,
        detailFallbacks: 0,
        callbackRetries: 0,
        callbackDispatchFailures: 0,
      },
    },
  });

  assert.equal((payload.diagnostics as Record<string, unknown>)?.detailBatchCount, undefined);
  assert.equal((payload.diagnostics as Record<string, unknown>)?.detailConcurrencyRequested, undefined);
  assert.equal((payload.diagnostics as Record<string, unknown>)?.detailConcurrencyEffective, undefined);
  assert.equal((payload.diagnostics as Record<string, unknown>)?.browserFallbackConcurrency, undefined);
  assert.equal(payload.diagnostics?.stageMetrics?.fetch.detailBatchCount, 1);
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

  assert.equal(budget, 3);
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

  assert.equal(budget, 3);
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

test('computeInitialDetailBudget reserves time for listing recovery on fresh runs', () => {
  const budget = computeInitialDetailBudget({
    requestedLimit: 20,
    targetWindow: { min: 20, max: 40 },
    scrapeTimeoutMs: 180000,
    elapsedMs: 0,
  });

  assert.equal(budget, 6);
});

test('resolveEffectiveScrapeTiming clamps expensive env pacing to protect timeout budget', () => {
  const timing = resolveEffectiveScrapeTiming({
    detailDelayMs: 15000,
    browserFallbackCooldownMs: 12000,
  });

  assert.equal(timing.requestedDetailDelayMs, 15000);
  assert.equal(timing.requestedBrowserFallbackCooldownMs, 12000);
  assert.equal(timing.detailDelayMs, 4000);
  assert.equal(timing.browserFallbackCooldownMs, 5000);
});
