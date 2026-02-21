import assert from 'node:assert/strict';
import test from 'node:test';

import { relaxPracujFiltersOnce } from './pracuj-filter-relaxation';

test('relaxPracujFiltersOnce drops invalidly strict IT filters gradually', () => {
  const first = relaxPracujFiltersOnce('pracuj-pl-it', {
    technologies: ['226', '89'],
    specializations: ['frontend'],
    keywords: 'frontend developer react',
  });
  assert.equal(first.reason, 'reduced tech/category');
  assert.deepEqual(first.next?.technologies, ['226']);

  const second = relaxPracujFiltersOnce('pracuj-pl-it', first.next!);
  assert.equal(second.reason, 'reduced tech/category');
  assert.equal(second.next?.technologies, undefined);
});

test('relaxPracujFiltersOnce widens published window before removing it', () => {
  const widened = relaxPracujFiltersOnce('pracuj-pl-it', { publishedWithinDays: 3 });
  assert.equal(widened.reason, 'widened publishedWithinDays to 7');
  assert.equal(widened.next?.publishedWithinDays, 7);

  const widened2 = relaxPracujFiltersOnce('pracuj-pl-it', widened.next!);
  assert.equal(widened2.reason, 'widened publishedWithinDays to 14');
  assert.equal(widened2.next?.publishedWithinDays, 14);
});

test('relaxPracujFiltersOnce reduces keyword strictness word-by-word', () => {
  const reduced = relaxPracujFiltersOnce('pracuj-pl-it', { keywords: 'nestjs typescript remote' });
  assert.equal(reduced.reason, 'reduced keywords');
  assert.equal(reduced.next?.keywords, 'nestjs typescript');

  const reduced2 = relaxPracujFiltersOnce('pracuj-pl-it', { keywords: 'nestjs' });
  assert.equal(reduced2.reason, 'removed keywords');
  assert.equal(reduced2.next, null);
});

