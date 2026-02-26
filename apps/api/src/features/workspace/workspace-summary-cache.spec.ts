import { WorkspaceSummaryCache } from './workspace-summary-cache';

describe('WorkspaceSummaryCache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns cache hit before ttl expires', () => {
    const now = new Date('2026-02-26T10:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const cache = new WorkspaceSummaryCache<{ ok: boolean }>(10);
    cache.set('u1', { ok: true });

    expect(cache.get('u1')).toEqual({ ok: true });
  });

  it('returns null after ttl expires', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(new Date('2026-02-26T10:00:00.000Z').getTime());

    const cache = new WorkspaceSummaryCache<{ ok: boolean }>(1);
    cache.set('u1', { ok: true });

    nowSpy.mockReturnValue(new Date('2026-02-26T10:00:02.000Z').getTime());
    expect(cache.get('u1')).toBeNull();
  });

  it('is disabled when ttl is zero', () => {
    const cache = new WorkspaceSummaryCache<{ ok: boolean }>(0);
    cache.set('u1', { ok: true });

    expect(cache.get('u1')).toBeNull();
  });
});

