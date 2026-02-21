import assert from 'node:assert/strict';
import test from 'node:test';

import { extractListingDomSignalsFromHtml } from './crawl';

test('zero-offers with recommended section does not produce primary scrape links', () => {
  const html = `
    <main>
      <section data-test="zero-offers-section">
        <p>Brak ofert</p>
      </section>
      <section data-test="section-recommended-offers">
        <a href="https://it.pracuj.pl/praca/a,oferta,111">Recommended A</a>
        <a href="https://it.pracuj.pl/praca/b,oferta,222">Recommended B</a>
      </section>
    </main>
  `;

  const result = extractListingDomSignalsFromHtml(html);
  assert.equal(result.hasZeroOffers, true);
  assert.deepEqual(result.primaryLinks, []);
  assert.deepEqual(result.recommendedLinks.sort(), [
    'https://it.pracuj.pl/praca/a,oferta,111',
    'https://it.pracuj.pl/praca/b,oferta,222',
  ]);
});

test('section-offers links are preferred and recommended links are ignored', () => {
  const html = `
    <main>
      <section data-test="section-offers">
        <a href="https://it.pracuj.pl/praca/primary,oferta,333">Primary</a>
      </section>
      <section data-test="section-recommended-offers">
        <a href="https://it.pracuj.pl/praca/recommended,oferta,444">Recommended</a>
      </section>
    </main>
  `;

  const result = extractListingDomSignalsFromHtml(html);
  assert.equal(result.hasZeroOffers, false);
  assert.deepEqual(result.primaryLinks, ['https://it.pracuj.pl/praca/primary,oferta,333']);
  assert.deepEqual(result.recommendedLinks, ['https://it.pracuj.pl/praca/recommended,oferta,444']);
});

test('fallback excludes recommended links when section-offers is missing', () => {
  const html = `
    <main>
      <a href="https://it.pracuj.pl/praca/primary,oferta,555">Primary inferred</a>
      <section data-test="section-recommended-offers">
        <a href="https://it.pracuj.pl/praca/recommended,oferta,666">Recommended inferred</a>
      </section>
    </main>
  `;

  const result = extractListingDomSignalsFromHtml(html);
  assert.equal(result.hasZeroOffers, false);
  assert.deepEqual(result.primaryLinks, ['https://it.pracuj.pl/praca/primary,oferta,555']);
  assert.deepEqual(result.recommendedLinks, ['https://it.pracuj.pl/praca/recommended,oferta,666']);
});

