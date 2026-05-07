import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeOfferBatchIngestDto } from './dto/scrape-offer-ingest.dto';

const validateDto = <T extends object>(cls: new () => T, payload: unknown) =>
  validateSync(plainToInstance(cls, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('scrape callback DTO contract', () => {
  it('accepts sanitized batch ingest payloads with isExpired', () => {
    const payload = {
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
          tags: ['backend'],
          salary: null,
          employmentType: 'B2B',
          requirements: ['TypeScript'],
          isExpired: false,
          rawPayload: {
            some: 'value',
          },
        },
      ],
    };

    expect(validateDto(ScrapeOfferBatchIngestDto, payload)).toEqual([]);
  });

  it('rejects batch ingest payloads with unknown job fields', () => {
    const payload = {
      eventId: 'event-ingest-batch-2',
      source: 'pracuj-pl',
      runId: 'run-1',
      sourceRunId: '00000000-0000-4000-8000-000000000001',
      jobs: [
        {
          source: 'pracuj-pl-it',
          sourceId: '123',
          title: 'Backend Engineer',
          company: 'ACME',
          location: 'Remote',
          description: 'Build services.',
          url: 'https://it.pracuj.pl/praca/backend,oferta,123',
          tags: ['backend'],
          debugOnly: 'should-not-leak',
        },
      ],
    };

    const errors = validateDto(ScrapeOfferBatchIngestDto, payload);
    expect(errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(errors)).toContain('debugOnly');
  });

  it('accepts sanitized completed callbacks without unsupported top-level diagnostics fields', () => {
    const payload = {
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
    };

    expect(validateDto(ScrapeCompleteDto, payload)).toEqual([]);
  });

  it('rejects completed callbacks with unsupported top-level diagnostics drift', () => {
    const payload = {
      eventId: 'event-1',
      source: 'pracuj-pl',
      runId: 'run-1',
      sourceRunId: '00000000-0000-4000-8000-000000000002',
      listingUrl: 'https://it.pracuj.pl/praca',
      status: 'COMPLETED',
      scrapedCount: 1,
      jobs: [
        {
          source: 'pracuj-pl-it',
          title: 'Backend Engineer',
          description: 'Build services.',
          url: 'https://it.pracuj.pl/praca/backend,oferta,123',
        },
      ],
      diagnostics: {
        pagesVisited: 3,
        detailBatchCount: 9,
        detailConcurrencyRequested: 4,
        detailConcurrencyEffective: 2,
        browserFallbackConcurrency: 'serial',
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
            salvagedOfferCount: 0,
          },
          finalize: {
            blockedRate: 0,
            attemptCount: 1,
            stopReason: null,
            resultKind: 'healthy',
          },
        },
      },
    };

    const errors = validateDto(ScrapeCompleteDto, payload);
    expect(errors.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('detailBatchCount');
    expect(serialized).toContain('detailConcurrencyRequested');
    expect(serialized).toContain('detailConcurrencyEffective');
    expect(serialized).toContain('browserFallbackConcurrency');
  });
});
