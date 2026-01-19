import { mkdir, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';

import type { ListingJobSummary, NormalizedJob, ParsedJob, RawPage } from '../sources/types';

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
};

const toSafeFilename = (value: string) => value.replace(/[^\w.-]+/g, '_');

const resolveOutputDir = (value?: string) => {
  if (!value) {
    return resolve(process.cwd(), 'data');
  }
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
};

const saveRawPages = async (pages: RawPage[], baseDir: string) => {
  const rawDir = join(baseDir, 'raw');
  await mkdir(rawDir, { recursive: true });

  const paths: Array<{ url: string; htmlPath: string }> = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const safe = toSafeFilename(page.url).slice(0, 120);
    const filename = `${index + 1}-${safe}.html`;
    const htmlPath = join(rawDir, filename);
    await writeFile(htmlPath, page.html, 'utf-8');
    paths.push({ url: page.url, htmlPath });
  }
  return paths;
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

export const saveOutput = async (payload: OutputPayload, outputDir?: string) => {
  const baseDir = resolveOutputDir(outputDir);
  await mkdir(baseDir, { recursive: true });

  const rawPages = payload.pages ? await saveRawPages(payload.pages, baseDir) : undefined;
  const listingData = await saveListingData(payload.listingHtml, payload.listingData, baseDir);
  const filename = `${toSafeFilename(payload.source)}-${toSafeFilename(payload.runId)}.json`;
  const path = join(baseDir, filename);

  const data = JSON.stringify(
    {
      source: payload.source,
      runId: payload.runId,
      listingUrl: payload.listingUrl,
      fetchedAt: payload.fetchedAt,
      jobs: payload.jobs,
      raw: payload.raw,
      rawPages,
      blockedUrls: payload.blockedUrls ?? [],
      jobLinks: payload.jobLinks ?? [],
      listingSummaries: payload.listingSummaries ?? [],
      listingHtmlPath: listingData.htmlPath,
      listingDataPath: listingData.dataPath,
    },
    null,
    2,
  );

  await writeFile(path, data, 'utf-8');
  return path;
};
