import { mkdir, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';

import type { NormalizedJob, ParsedJob, RawPage } from '../sources/types';

type OutputPayload = {
  source: string;
  runId: string;
  listingUrl?: string;
  fetchedAt: string;
  jobs: NormalizedJob[];
  raw?: ParsedJob[];
  pages?: RawPage[];
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

export const saveOutput = async (payload: OutputPayload, outputDir?: string) => {
  const baseDir = resolveOutputDir(outputDir);
  await mkdir(baseDir, { recursive: true });

  const rawPages = payload.pages ? await saveRawPages(payload.pages, baseDir) : undefined;
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
    },
    null,
    2,
  );

  await writeFile(path, data, 'utf-8');
  return path;
};
