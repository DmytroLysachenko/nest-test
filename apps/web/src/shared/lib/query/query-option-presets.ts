import { QUERY_GC_TIME, QUERY_STALE_TIME } from './query-constants';

export const staticQueryPreset = () => ({
  staleTime: QUERY_STALE_TIME.CORE_DATA,
  gcTime: QUERY_GC_TIME.LONG_LIVED,
});

export const mutableQueryPreset = () => ({
  staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
});

export const liveQueryPreset = () => ({
  staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
});
