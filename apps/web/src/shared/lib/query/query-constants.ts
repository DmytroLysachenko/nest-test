/**
 * Global cache tiers for TanStack Query.
 *
 * - CORE_DATA: Never becomes stale automatically. Re-fetching is handled manually via mutations.
 * - WORKFLOW_DATA: Long-lived cache for things like document lists or offer history.
 * - DIAGNOSTICS_DATA: Shorter lived, but still stays in cache for 1 minute.
 */
export const QUERY_STALE_TIME = {
  CORE_DATA: Infinity, // Manual invalidation only
  WORKFLOW_DATA: 1000 * 60 * 30, // 30 minutes
  DIAGNOSTICS_DATA: 1000 * 60 * 1, // 1 minute
} as const;

/**
 * Global garbage collection times (gcTime).
 * How long data remains in the cache after being unused.
 */
export const QUERY_GC_TIME = {
  LONG_LIVED: 1000 * 60 * 60 * 24, // 24 hours (for CORE_DATA)
  DEFAULT: 1000 * 60 * 60, // 1 hour
} as const;
