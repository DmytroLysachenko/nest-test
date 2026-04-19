import { buildAttentionSignals, buildOfferReliabilityContext } from './job-offers-attention';

describe('job offer attention reliability context', () => {
  it('marks low-context offers as degraded source work', () => {
    const reliabilityContext = buildOfferReliabilityContext({ qualityReason: 'low_context' });
    const signals = buildAttentionSignals({
      status: 'NEW',
      source: { reliabilityContext },
      now: new Date('2026-04-19T10:00:00.000Z'),
    });

    expect(reliabilityContext).toEqual(
      expect.objectContaining({
        key: 'degraded_source',
        severity: 'warning',
      }),
    );
    expect(signals).toContainEqual(
      expect.objectContaining({
        key: 'degraded_source',
        label: 'Lower-confidence source data',
      }),
    );
  });

  it('marks stale-run recovered offers separately from ordinary degraded output', () => {
    const reliabilityContext = buildOfferReliabilityContext({
      runError: '[timeout] run stale watchdog: heartbeat-stopped-or-callback-missing',
      progress: { recoveredFromStaleAt: '2026-04-19T09:00:00.000Z' },
    });

    expect(reliabilityContext).toEqual(
      expect.objectContaining({
        key: 'recovered_stale_run',
        label: 'Recovered scrape output',
        reasons: expect.arrayContaining(['recovered-from-stale-run']),
      }),
    );
  });
});
