import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveResetBundleOptions } from './reset-test-bundle-core';

test('resolveResetBundleOptions defaults to preview without post-audit', () => {
  const options = resolveResetBundleOptions({});

  assert.deepEqual(options, {
    applyChanges: false,
    runPostAudit: false,
    strictPostAudit: false,
  });
});

test('resolveResetBundleOptions enables post-audit automatically for apply mode', () => {
  const options = resolveResetBundleOptions({
    APPLY_CHANGES: 'true',
  });

  assert.deepEqual(options, {
    applyChanges: true,
    runPostAudit: true,
    strictPostAudit: false,
  });
});

test('resolveResetBundleOptions allows explicit post-audit override', () => {
  const options = resolveResetBundleOptions({
    APPLY_CHANGES: 'true',
    RESET_BUNDLE_RUN_POST_AUDIT: 'false',
    RESET_BUNDLE_STRICT_POST_AUDIT: 'yes',
  });

  assert.deepEqual(options, {
    applyChanges: true,
    runPostAudit: false,
    strictPostAudit: true,
  });
});
