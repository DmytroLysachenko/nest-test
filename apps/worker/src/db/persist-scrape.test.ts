import assert from 'node:assert/strict';
import test from 'node:test';

import { dedupeJobsByUrl, dedupeUrls } from './persist-scrape';

test('dedupeUrls removes repeated links before persistence', () => {
  assert.deepEqual(dedupeUrls(['https://a', 'https://b', 'https://a', '']), ['https://a', 'https://b']);
});

test('dedupeJobsByUrl keeps the latest payload for a repeated offer url', () => {
  const jobs = dedupeJobsByUrl([
    {
      source: 'pracuj-pl',
      sourceId: '1',
      title: 'Older',
      company: 'A',
      location: 'Remote',
      description: 'Older',
      url: 'https://offer',
      tags: [],
      salary: null,
      employmentType: null,
      requirements: [],
    },
    {
      source: 'pracuj-pl',
      sourceId: '2',
      title: 'Newer',
      company: 'A',
      location: 'Remote',
      description: 'Newer',
      url: 'https://offer',
      tags: ['listing-salvage'],
      salary: null,
      employmentType: null,
      requirements: [],
    },
  ]);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.sourceId, '2');
  assert.equal(jobs[0]?.title, 'Newer');
});
