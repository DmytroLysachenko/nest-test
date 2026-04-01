import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCompanyName, resolvePracujCategoryDefinition } from '@repo/db';

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
  assert.equal(job?.applyUrl, null);
  assert.equal(job?.postedAt, null);
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
  assert.deepEqual(job?.details?.workModes, ['mobile']);
  assert.deepEqual(job?.details?.positionLevels, ['staff']);
  assert.deepEqual(job?.tags?.sort(), ['missing-requirements', 'sparse-technologies'].sort());
});

test('normalizePracujPl keeps source metadata and marks missing employment type', () => {
  const [job] = normalizePracujPl([
    {
      sourceId: 'offer-3',
      title: ' Office Manager ',
      company: ' Example Corp ',
      location: ' Warsaw ',
      description: ' Coordinate office operations ',
      url: 'https://www.pracuj.pl/praca/office-manager,oferta,3',
      applyUrl: 'https://www.pracuj.pl/praca/office-manager,oferta,3',
      postedAt: '2026-04-01T09:00:00.000Z',
      sourceCompanyProfileUrl: 'https://pracodawcy.pracuj.pl/company/123',
      requirements: [],
      details: {
        workSchedules: ['Pełny etat'],
      },
    },
  ]);

  assert.equal(job?.applyUrl, 'https://www.pracuj.pl/praca/office-manager,oferta,3');
  assert.equal(job?.postedAt, '2026-04-01T09:00:00.000Z');
  assert.equal(job?.sourceCompanyProfileUrl, 'https://pracodawcy.pracuj.pl/company/123');
  assert.ok(job?.tags?.includes('missing-employment-type'));
});

test('shared catalog normalization resolves company names and pracuj categories conservatively', () => {
  assert.deepEqual(normalizeCompanyName(' ACME sp. z o.o. '), {
    canonicalName: 'ACME sp. z o.o.',
    normalizedName: 'acme',
  });

  assert.deepEqual(resolvePracujCategoryDefinition('5015', 'general'), {
    slug: 'software-development',
    label: 'Software development',
    aliases: ['it - rozwoj oprogramowania', 'software engineering', 'development'],
  });

  assert.deepEqual(resolvePracujCategoryDefinition('devops', 'it'), {
    slug: 'it-administration',
    label: 'IT administration',
    aliases: ['it - administracja', 'system administration', 'security'],
  });
});
