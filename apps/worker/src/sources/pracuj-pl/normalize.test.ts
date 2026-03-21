import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePracujPl } from './normalize';

test('normalizePracujPl canonicalizes contract, work mode, and seniority aliases', () => {
  const [job] = normalizePracujPl([
    {
      sourceId: 'offer-1',
      title: ' Senior Frontend Developer ',
      company: ' ACME ',
      location: ' Warszawa ',
      description: ' Build product UI ',
      url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
      employmentType: ' kontrakt B2B ',
      requirements: [' React '],
      details: {
        contractTypes: ['Umowa o pracę', 'kontrakt B2B', 'kontrakt B2B'],
        workModes: ['Praca zdalna', 'Hybrydowo', 'stacjonarnie'],
        positionLevels: ['Starszy specjalista (Senior)', 'Ekspert / Lead', 'Specjalista (Mid / Regular)'],
      },
    },
  ]);

  assert.equal(job?.employmentType, 'b2b');
  assert.deepEqual(job?.details?.contractTypes, ['uop', 'b2b']);
  assert.deepEqual(job?.details?.workModes, ['remote', 'hybrid', 'onsite']);
  assert.deepEqual(job?.details?.positionLevels, ['senior', 'lead', 'mid']);
});

test('normalizePracujPl preserves unknown aliases as normalized lowercase text', () => {
  const [job] = normalizePracujPl([
    {
      sourceId: 'offer-2',
      title: ' Product Engineer ',
      description: ' Build product UI ',
      url: 'https://it.pracuj.pl/praca/frontend,oferta,2',
      employmentType: 'Fractional',
      details: {
        contractTypes: ['Fractional'],
        workModes: ['Field'],
        positionLevels: ['Staff'],
      },
    },
  ]);

  assert.equal(job?.employmentType, 'fractional');
  assert.deepEqual(job?.details?.contractTypes, ['fractional']);
  assert.deepEqual(job?.details?.workModes, ['field']);
  assert.deepEqual(job?.details?.positionLevels, ['staff']);
});
