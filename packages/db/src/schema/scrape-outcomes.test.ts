import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyScrapeOutcome } from './scrape-outcomes';

test('classifyScrapeOutcome keeps successful completed runs as success', () => {
  assert.equal(
    classifyScrapeOutcome({
      status: 'COMPLETED',
      resultKind: 'healthy',
      scrapedCount: 4,
    }),
    'success',
  );
});

test('classifyScrapeOutcome keeps blocked completed runs with recovered offers as partial success', () => {
  assert.equal(
    classifyScrapeOutcome({
      status: 'COMPLETED',
      resultKind: 'blocked',
      scrapedCount: 2,
      failureReason: 'source_http_blocked',
    }),
    'partial_success',
  );
});

test('classifyScrapeOutcome marks failed runs with recovered offers as partial success', () => {
  assert.equal(
    classifyScrapeOutcome({
      status: 'FAILED',
      failureType: 'timeout',
      scrapedCount: 3,
      failureReason: 'browser_crash_after_ingest',
    }),
    'partial_success',
  );
});

test('classifyScrapeOutcome preserves callback rejection for empty failed callbacks', () => {
  assert.equal(
    classifyScrapeOutcome({
      status: 'FAILED',
      failureType: 'callback',
      scrapedCount: 0,
      failureReason: 'callback_signature_invalid',
    }),
    'callback_rejected',
  );
});

test('classifyScrapeOutcome preserves timeout classification for empty failed callbacks', () => {
  assert.equal(
    classifyScrapeOutcome({
      status: 'FAILED',
      failureType: 'timeout',
      scrapedCount: 0,
      failureReason: 'worker_timed_out',
    }),
    'worker_timeout',
  );
});
