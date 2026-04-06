import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parsePracujPl } from './parse';

const readFixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

test('parsePracujPl falls back to NEXT_DATA job offer fields when DOM selectors are sparse', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/platform-engineer,oferta,123',
      html: readFixture('detail-next-data-sparse.html'),
    },
  ]);

  assert.equal(result?.title, 'Platform Engineer');
  assert.equal(result?.company, 'Example Corp');
  assert.equal(result?.location, 'Remote, Poland');
  assert.equal(result?.applyUrl, 'https://it.pracuj.pl/praca/platform-engineer,oferta,123');
  assert.deepEqual(result?.requirements, ['TypeScript', 'Node.js']);
  assert.deepEqual(result?.details?.workModes, ['remote']);
  assert.deepEqual(result?.details?.contractTypes, ['b2b']);
  assert.deepEqual(result?.details?.positionLevels, ['senior']);
});

test('parsePracujPl keeps fallback description instead of crashing on sparse pages', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/frontend-engineer,oferta,456',
      html: readFixture('detail-sparse-fallback.html'),
    },
  ]);

  assert.equal(result?.title, 'Frontend Engineer');
  assert.equal(result?.description, 'No description found');
  assert.equal(result?.applyUrl, 'https://it.pracuj.pl/praca/frontend-engineer,oferta,456');
});

test('parsePracujPl sanitizes noisy company description and extracts workplace metadata', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/data-engineer,oferta,789',
      html: readFixture('detail-company-workplace.html'),
    },
  ]);

  assert.equal(result?.details?.companyDescription, 'Build modern data products for banks.');
  assert.equal(result?.details?.workplace, 'Hybrid');
  assert.equal(result?.details?.companyLocation, 'Warszawa, Prosta 1');
});
