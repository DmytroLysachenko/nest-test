import { mkdir, readdir, rm, stat, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';

import type { DetailFetchDiagnostics, ListingJobSummary, NormalizedJob, ParsedJob, RawPage } from '../sources/types';

type OutputPayload = {
  source: string;
  runId: string;
  listingUrl?: string;
  fetchedAt: string;
  jobs: NormalizedJob[];
  raw?: ParsedJob[];
  pages?: RawPage[];
  blockedUrls?: string[];
  jobLinks?: string[];
  listingHtml?: string;
  listingData?: unknown;
  listingSummaries?: ListingJobSummary[];
  detailDiagnostics?: DetailFetchDiagnostics[];
};

export type OutputArtifactManifest = {
  outputPath: string;
  retentionExpiresAt: string | null;
  rawPages: {
    count: number;
    directory: string | null;
    samplePaths: string[];
  };
  listing: {
    htmlPath: string | null;
    dataPath: string | null;
  };
};

const toSafeFilename = (value: string) => value.replace(/[^\w.-]+/g, '_');

const resolveOutputDir = (value?: string) => {
  if (!value) {
    return resolve(process.cwd(), 'data');
  }
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
};

const pruneExpiredArtifacts = async (baseDir: string, retentionHours: number) => {
  const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;

  const prunePath = async (targetPath: string) => {
    const targetStat = await stat(targetPath);
    if (targetStat.isDirectory()) {
      const children = await readdir(targetPath, { withFileTypes: true });
      for (const child of children) {
        await prunePath(join(targetPath, child.name));
      }
      const remaining = await readdir(targetPath);
      if (remaining.length === 0 && targetStat.mtimeMs < cutoff) {
        await rm(targetPath, { recursive: true, force: true });
      }
      return;
    }

    if (targetStat.mtimeMs < cutoff) {
      await rm(targetPath, { force: true });
    }
  };

  const entries = await readdir(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    await prunePath(join(baseDir, entry.name));
  }
};

const saveRawPages = async (pages: RawPage[], baseDir: string) => {
  const rawDir = join(baseDir, 'raw');
  await mkdir(rawDir, { recursive: true });

  const paths: Array<{ url: string; htmlPath: string }> = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    if (!page) {
      continue;
    }
    const safe = toSafeFilename(page.url).slice(0, 120);
    const filename = `${index + 1}-${safe}.html`;
    const htmlPath = join(rawDir, filename);
    await writeFile(htmlPath, page.html, 'utf-8');
    paths.push({ url: page.url, htmlPath });
  }
  return { rawDir, paths };
};

const saveListingData = async (listingHtml: string | undefined, listingData: unknown, baseDir: string) => {
  const listingDir = join(baseDir, 'listing');
  await mkdir(listingDir, { recursive: true });

  let htmlPath: string | undefined;
  if (listingHtml) {
    htmlPath = join(listingDir, 'listing.html');
    await writeFile(htmlPath, listingHtml, 'utf-8');
  }

  let dataPath: string | undefined;
  if (listingData) {
    dataPath = join(listingDir, 'listing-data.json');
    await writeFile(dataPath, JSON.stringify(listingData, null, 2), 'utf-8');
  }

  return { htmlPath, dataPath };
};

export const saveOutput = async (
  payload: OutputPayload,
  outputDir?: string,
  mode: 'full' | 'minimal' = 'full',
  retentionHours?: number,
) => {
  const baseDir = resolveOutputDir(outputDir);
  await mkdir(baseDir, { recursive: true });

  const rawPages = mode === 'full' && payload.pages ? await saveRawPages(payload.pages, baseDir) : undefined;
  const listingData: { htmlPath?: string; dataPath?: string } =
    mode === 'full' ? await saveListingData(payload.listingHtml, payload.listingData, baseDir) : {};
  const filename = `${toSafeFilename(payload.source)}-${toSafeFilename(payload.runId)}.json`;
  const path = join(baseDir, filename);

  const data = JSON.stringify(
    mode === 'full'
      ? {
          source: payload.source,
          runId: payload.runId,
          listingUrl: payload.listingUrl,
          fetchedAt: payload.fetchedAt,
          jobs: payload.jobs,
          raw: payload.raw,
          rawPages: rawPages?.paths,
          blockedUrls: payload.blockedUrls ?? [],
          jobLinks: payload.jobLinks ?? [],
          listingSummaries: payload.listingSummaries ?? [],
          detailDiagnostics: payload.detailDiagnostics ?? [],
          listingHtmlPath: listingData.htmlPath,
          listingDataPath: listingData.dataPath,
        }
      : {
          source: payload.source,
          runId: payload.runId,
          listingUrl: payload.listingUrl,
          fetchedAt: payload.fetchedAt,
          jobs: payload.jobs,
        },
    null,
    2,
  );

  await writeFile(path, data, 'utf-8');
  if (typeof retentionHours === 'number' && retentionHours > 0) {
    await pruneExpiredArtifacts(baseDir, retentionHours);
  }
  const retentionExpiresAt =
    typeof retentionHours === 'number' && retentionHours > 0
      ? new Date(Date.now() + retentionHours * 60 * 60 * 1000).toISOString()
      : null;

  return {
    path,
    artifacts: {
      outputPath: path,
      retentionExpiresAt,
      rawPages: {
        count: rawPages?.paths.length ?? 0,
        directory: rawPages?.rawDir ?? null,
        samplePaths: rawPages?.paths.slice(0, 5).map((item) => item.htmlPath) ?? [],
      },
      listing: {
        htmlPath: listingData.htmlPath ?? null,
        dataPath: listingData.dataPath ?? null,
      },
    } satisfies OutputArtifactManifest,
  };
};
