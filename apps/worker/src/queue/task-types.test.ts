import assert from 'node:assert/strict';
import test from 'node:test';

import { taskEnvelopeSchema } from './task-types';

test('accepts legacy payload without sourceRunId/requestId', () => {
  const parsed = taskEnvelopeSchema.safeParse({
    name: 'scrape:source',
    payload: {
      source: 'pracuj-pl',
      listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
      limit: 10,
    },
  });

  assert.equal(parsed.success, true);
});

test('accepts extended payload with sourceRunId/requestId', () => {
  const parsed = taskEnvelopeSchema.safeParse({
    name: 'scrape:source',
    payload: {
      source: 'pracuj-pl',
      sourceRunId: '2f149bf9-65fd-48b5-aec7-8dc86abfca78',
      requestId: 'req-123',
      listingUrl: 'https://it.pracuj.pl/praca?wm=home-office',
      limit: 5,
    },
  });

  assert.equal(parsed.success, true);
});

test('rejects invalid sourceRunId', () => {
  const parsed = taskEnvelopeSchema.safeParse({
    name: 'scrape:source',
    payload: {
      source: 'pracuj-pl',
      sourceRunId: 'not-a-uuid',
    },
  });

  assert.equal(parsed.success, false);
});
