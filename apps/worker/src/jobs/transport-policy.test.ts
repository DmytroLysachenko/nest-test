import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTransportPolicy } from './transport-policy';
import { computeRetryDelayMs } from './retry-policy';

test('resolveTransportPolicy uses hybrid mode for pracuj sources', () => {
  assert.equal(resolveTransportPolicy('pracuj-pl-it'), 'hybrid');
  assert.equal(resolveTransportPolicy('pracuj-pl'), 'hybrid');
});

test('computeRetryDelayMs applies bounded exponential backoff', () => {
  assert.equal(computeRetryDelayMs(1, 500, 4000), 500);
  assert.equal(computeRetryDelayMs(2, 500, 4000), 1000);
  assert.equal(computeRetryDelayMs(4, 500, 4000), 4000);
});
