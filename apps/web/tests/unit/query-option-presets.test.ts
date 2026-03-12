import { describe, expect, it } from 'vitest';

import { liveQueryPreset, mutableQueryPreset, staticQueryPreset } from '@/shared/lib/query/query-option-presets';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';

describe('query option presets', () => {
  it('returns long-lived settings for static data', () => {
    expect(staticQueryPreset()).toEqual({
      staleTime: QUERY_STALE_TIME.CORE_DATA,
      gcTime: QUERY_GC_TIME.LONG_LIVED,
    });
  });

  it('returns workflow caching for mutable data', () => {
    expect(mutableQueryPreset()).toEqual({
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    });
  });

  it('returns short-lived caching for live data', () => {
    expect(liveQueryPreset()).toEqual({
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
    });
  });
});
