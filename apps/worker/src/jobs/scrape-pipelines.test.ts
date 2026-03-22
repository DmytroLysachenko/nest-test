import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSalvagedListingJobs } from './scrape-pipelines';

test('buildSalvagedListingJobs keeps only high-confidence listing summaries and tags them as degraded', () => {
  const jobs = buildSalvagedListingJobs([
    {
      url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
      title: 'Frontend Developer',
      company: 'ACME',
      description: 'React role with modern TypeScript stack.',
      sourceId: '1001',
    },
    {
      url: 'https://it.pracuj.pl/praca/frontend,oferta,2',
      title: '',
      description: 'Missing title should be dropped.',
    },
    {
      url: 'https://it.pracuj.pl/praca/frontend,oferta,3',
      title: 'Backend Developer',
    },
  ]);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.title, 'Frontend Developer');
  assert.deepEqual(jobs[0]?.tags, ['listing-salvage', 'degraded-source']);
  assert.equal(jobs[0]?.description, 'React role with modern TypeScript stack.');
});
