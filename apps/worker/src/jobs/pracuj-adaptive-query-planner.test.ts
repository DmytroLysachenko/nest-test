import assert from 'node:assert/strict';
import test from 'node:test';

import { planPracujAdaptiveQuery } from './pracuj-adaptive-query-planner';

test('planPracujAdaptiveQuery narrows broad acquisition into target window when specialization helps', async () => {
  const counts = new Map<string, number>([
    ['base', 64],
    ['specialization', 28],
    ['keyword', 9],
  ]);

  const result = await planPracujAdaptiveQuery({
    source: 'pracuj-pl-it',
    acquisitionFilters: {
      positionLevels: ['1', '17', '4'],
      location: 'Gdynia',
      radiusKm: 35,
    },
    matchingFilters: {
      specializations: ['frontend'],
      keywords: 'junior frontend',
    },
    buildListingUrl: (filters) => `https://it.pracuj.pl/praca?${JSON.stringify(filters)}`,
    targetWindow: { min: 20, max: 40 },
    probeListingCount: async (_filters, stage) => counts.get(stage) ?? 0,
  });

  assert.equal(result.selectedStage, 'specialization');
  assert.equal(result.selectedCount, 28);
  assert.equal(result.targetWindowMissed, false);
  assert.equal(result.scarcityReason, null);
  assert.equal(result.attempts.length, 2);
});

test('planPracujAdaptiveQuery broadens low-scarcity acquisition when initial listing count is too low', async () => {
  const counts = new Map<string, number>([
    ['base', 3],
    ['broaden_radius_75', 8],
    ['broaden_radius_150', 18],
    ['remove_seniority_band', 31],
  ]);

  const result = await planPracujAdaptiveQuery({
    source: 'pracuj-pl-it',
    acquisitionFilters: {
      positionLevels: ['1', '17', '4'],
      location: 'Gdynia',
      radiusKm: 35,
    },
    matchingFilters: undefined,
    buildListingUrl: (filters) => `https://it.pracuj.pl/praca?${JSON.stringify(filters)}`,
    targetWindow: { min: 20, max: 40 },
    probeListingCount: async (_filters, stage) => counts.get(stage) ?? 0,
  });

  assert.equal(result.selectedStage, 'remove_seniority_band');
  assert.equal(result.selectedCount, 31);
  assert.equal(result.targetWindowMissed, false);
});
