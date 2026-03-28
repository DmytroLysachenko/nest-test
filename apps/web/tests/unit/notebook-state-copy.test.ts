import { describe, expect, it } from 'vitest';

import { getNotebookCollectionState } from '@/features/job-offers/model/notebook-state-copy';

describe('getNotebookCollectionState', () => {
  it('returns hidden copy for strict mode results hidden by hard constraints', () => {
    const result = getNotebookCollectionState({
      mode: 'strict',
      hiddenByModeCount: 3,
      degradedResultCount: 0,
      lastScrapeStatus: 'COMPLETED',
    });

    expect(result.key).toBe('hidden');
    expect(result.actionLabel).toBe('Switch to approx');
    expect(result.nextMode).toBe('approx');
  });

  it('returns degraded copy before generic empty copy', () => {
    const result = getNotebookCollectionState({
      mode: 'approx',
      hiddenByModeCount: 0,
      degradedResultCount: 2,
      lastScrapeStatus: 'COMPLETED',
    });

    expect(result.key).toBe('degraded');
    expect(result.actionLabel).toBe('Switch to explore');
  });

  it('returns failed copy when the last scrape did not complete cleanly', () => {
    const result = getNotebookCollectionState({
      mode: 'strict',
      hiddenByModeCount: 0,
      degradedResultCount: 0,
      lastScrapeStatus: 'FAILED',
    });

    expect(result.key).toBe('failed');
    expect(result.actionLabel).toBe('Open planning');
    expect(result.nextMode).toBeNull();
  });
});
