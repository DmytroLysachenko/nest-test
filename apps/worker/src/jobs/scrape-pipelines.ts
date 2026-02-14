import { defaultGeneralListingUrl, defaultListingUrl } from '../sources/pracuj-pl/constants';
import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { buildPracujListingUrl } from '../sources/pracuj-pl/url-builder';
import type { ScrapeSourceJob } from '../types/jobs';

export type ScrapePipelineId = 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';

type PipelineDefinition = {
  id: ScrapePipelineId;
  defaultListingUrl: string;
  buildListingUrl: (filters: NonNullable<ScrapeSourceJob['filters']>) => string;
  normalizeSource: string;
};

const pipelines: Record<ScrapePipelineId, PipelineDefinition> = {
  'pracuj-pl': {
    id: 'pracuj-pl',
    defaultListingUrl,
    buildListingUrl: (filters) => buildPracujListingUrl(filters, 'pracuj-pl'),
    normalizeSource: 'pracuj-pl',
  },
  'pracuj-pl-it': {
    id: 'pracuj-pl-it',
    defaultListingUrl,
    buildListingUrl: (filters) => buildPracujListingUrl(filters, 'pracuj-pl-it'),
    normalizeSource: 'pracuj-pl-it',
  },
  'pracuj-pl-general': {
    id: 'pracuj-pl-general',
    defaultListingUrl: defaultGeneralListingUrl,
    buildListingUrl: (filters) => buildPracujListingUrl(filters, 'pracuj-pl-general'),
    normalizeSource: 'pracuj-pl-general',
  },
};

export const resolvePipeline = (source: string): PipelineDefinition => {
  if (source in pipelines) {
    return pipelines[source as ScrapePipelineId];
  }
  throw new Error(`Unknown source: ${source}`);
};

export const runPipeline = async (
  source: string,
  input: {
    headless: boolean;
    listingUrl: string;
    limit?: number;
    logger: Parameters<typeof crawlPracujPl>[3];
    options?: Parameters<typeof crawlPracujPl>[4];
  },
) => {
  const pipeline = resolvePipeline(source);
  const crawlResult = await crawlPracujPl(input.headless, input.listingUrl, input.limit, input.logger, input.options);
  const parsedJobs =
    crawlResult.pages.length > 0
      ? parsePracujPl(crawlResult.pages)
      : input.options?.listingOnly
        ? []
        : crawlResult.listingSummaries.map((summary) => ({
            title: summary.title ?? 'Unknown title',
            company: summary.company,
            location: summary.location,
            description: summary.description ?? 'Listing summary only',
            url: summary.url,
            salary: summary.salary,
            sourceId: summary.sourceId,
            requirements: [],
            details: summary.details,
          }));
  const normalized = normalizePracujPl(parsedJobs, pipeline.normalizeSource);

  return {
    pipeline,
    crawlResult,
    parsedJobs,
    normalized,
  };
};

