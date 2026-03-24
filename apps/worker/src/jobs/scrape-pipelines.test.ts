import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSalvagedListingJobs, mergeParsedJobsWithListingSalvage } from './scrape-pipelines';

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

test('mergeParsedJobsWithListingSalvage keeps parsed jobs and appends unseen salvageable summaries', () => {
  const jobs = mergeParsedJobsWithListingSalvage(
    [
      {
        title: 'Frontend Developer',
        company: 'ACME',
        description: 'Detailed description from detail page.',
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1?ref=detail',
      },
    ],
    [
      {
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
        title: 'Frontend Developer',
        company: 'ACME',
        description: 'Listing summary version.',
      },
      {
        url: 'https://it.pracuj.pl/praca/backend,oferta,2',
        title: 'Backend Developer',
        company: 'Globex',
        description: 'Strong listing summary for backend role.',
      },
    ],
  );

  assert.equal(jobs.length, 2);
  assert.equal(jobs[0]?.title, 'Frontend Developer');
  assert.equal(jobs[1]?.title, 'Backend Developer');
  assert.deepEqual(jobs[1]?.tags, ['listing-salvage', 'degraded-source']);
});

test('mergeParsedJobsWithListingSalvage excludes URLs skipped as fresh cache hits', () => {
  const jobs = mergeParsedJobsWithListingSalvage(
    [],
    [
      {
        url: 'https://it.pracuj.pl/praca/frontend,oferta,1',
        title: 'Frontend Developer',
        company: 'ACME',
        description: 'Listing summary version.',
      },
    ],
    ['https://it.pracuj.pl/praca/frontend,oferta,1'],
  );

  assert.equal(jobs.length, 0);
});
