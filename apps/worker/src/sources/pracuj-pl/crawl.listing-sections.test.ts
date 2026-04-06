import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { extractListingDomSignalsFromHtml } from './crawl';

const readFixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

test('zero-offers with recommended section does not produce primary scrape links', () => {
  const result = extractListingDomSignalsFromHtml(readFixture('listing-recommended-only.html'));
  assert.equal(result.hasZeroOffers, true);
  assert.deepEqual(result.primaryLinks, []);
  assert.deepEqual(result.recommendedLinks.sort(), [
    'https://it.pracuj.pl/praca/a,oferta,111',
    'https://it.pracuj.pl/praca/b,oferta,222',
  ]);
});

test('section-offers links are preferred and recommended links are ignored', () => {
  const result = extractListingDomSignalsFromHtml(readFixture('listing-primary-and-recommended.html'));
  assert.equal(result.hasZeroOffers, false);
  assert.deepEqual(result.primaryLinks, ['https://it.pracuj.pl/praca/primary,oferta,333']);
  assert.deepEqual(result.recommendedLinks, ['https://it.pracuj.pl/praca/recommended,oferta,444']);
});

test('fallback excludes recommended links when section-offers is missing', () => {
  const result = extractListingDomSignalsFromHtml(readFixture('listing-fallback-primary.html'));
  assert.equal(result.hasZeroOffers, false);
  assert.deepEqual(result.primaryLinks, ['https://it.pracuj.pl/praca/primary,oferta,555']);
  assert.deepEqual(result.recommendedLinks, ['https://it.pracuj.pl/praca/recommended,oferta,666']);
});
