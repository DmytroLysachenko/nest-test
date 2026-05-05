import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { tmpdir } from 'node:os';

import { saveOutput } from './save-output';

test('saveOutput marks filesystem artifacts as ephemeral and honors raw sample limit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worker-save-output-'));

  try {
    const result = await saveOutput(
      {
        source: 'pracuj-pl',
        runId: 'run-1',
        fetchedAt: '2026-05-04T00:00:00.000Z',
        jobs: [],
        pages: [
          { url: 'https://example.com/1', html: '<html>1</html>' },
          { url: 'https://example.com/2', html: '<html>2</html>' },
          { url: 'https://example.com/3', html: '<html>3</html>' },
        ],
        listingHtml: '<html>listing</html>',
        listingData: { ok: true },
      },
      dir,
      'full',
      24,
      2,
    );

    assert.equal(result.artifacts.artifactMode, 'full');
    assert.equal(result.artifacts.storageBackend, 'filesystem');
    assert.equal(result.artifacts.availability, 'ephemeral');
    assert.equal(result.artifacts.debugEnabled, true);
    assert.equal(result.artifacts.rawPages.count, 3);
    assert.equal(result.artifacts.rawPages.samplePaths.length, 2);
    assert.ok(result.artifacts.retentionExpiresAt);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('saveOutput omits raw artifacts in minimal mode and still writes compact summary', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worker-save-output-'));

  try {
    const result = await saveOutput(
      {
        source: 'pracuj-pl',
        runId: 'run-2',
        fetchedAt: '2026-05-04T00:00:00.000Z',
        jobs: [
          {
            source: 'pracuj-pl',
            sourceId: null,
            title: 'Role',
            company: null,
            location: null,
            description: 'x',
            url: 'https://example.com/job',
            tags: [],
            salary: null,
            employmentType: null,
            requirements: [],
          },
        ],
      },
      dir,
      'minimal',
      undefined,
      5,
    );

    assert.equal(result.artifacts.artifactMode, 'minimal');
    assert.equal(result.artifacts.debugEnabled, false);
    assert.equal(result.artifacts.rawPages.count, 0);
    assert.deepEqual(result.artifacts.rawPages.samplePaths, []);
    assert.equal(result.artifacts.listing.htmlPath, null);
    assert.equal(result.artifacts.listing.dataPath, null);
    assert.equal(result.artifacts.retentionExpiresAt, null);

    const saved = JSON.parse(await readFile(result.path, 'utf-8')) as { jobs: unknown[]; source: string };
    assert.equal(saved.source, 'pracuj-pl');
    assert.equal(saved.jobs.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
