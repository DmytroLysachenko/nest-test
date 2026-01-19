import { load } from 'cheerio';

import type { JobDetails, ParsedJob, RawPage } from '../types';

type JsonLdJob = {
  '@type'?: string;
  title?: string;
  description?: string;
  employmentType?: string | string[];
  hiringOrganization?: { name?: string };
  jobLocation?: Array<{ address?: { addressLocality?: string; addressRegion?: string } }>;
  baseSalary?: {
    value?: { value?: number; minValue?: number; maxValue?: number; unitText?: string };
    currency?: string;
  };
  identifier?: { value?: string };
};

const extractJsonLdBlocks = (html: string) => {
  const blocks: string[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = regex.exec(html);
  while (match) {
    blocks.push(match[1]);
    match = regex.exec(html);
  }
  return blocks;
};

const toText = (value?: string) => (value ? value.replace(/<[^>]+>/g, '').trim() : '');
const cleanText = (value?: string) => (value ? value.replace(/\s+/g, ' ').trim() : '');

const extractTextBySelectors = (html: string, selectors: string[]) => {
  const $ = load(html);
  for (const selector of selectors) {
    const text = cleanText($(selector).first().text());
    if (text) {
      return text;
    }
  }
  return '';
};

const extractListBySelectors = (html: string, selectors: string[]) => {
  const $ = load(html);
  for (const selector of selectors) {
    const items = $(selector)
      .find('li')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }
  return [];
};

const extractChipText = (value: string) =>
  cleanText(value.replace(/[,;]\s*$/, '').replace(/\s*\|\s*/g, ' '));

const extractChips = (html: string, selectors: string[]) => {
  const $ = load(html);
  for (const selector of selectors) {
    const items = $(selector)
      .find('li, [data-test*="chip"], [class*="chip"], [class*="tag"]')
      .map((_, el) => extractChipText($(el).text()))
      .get()
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }
  return [];
};

const findSectionByHeading = ($: ReturnType<typeof load>, patterns: RegExp[]) => {
  const headings = $('h1, h2, h3, h4');
  for (const heading of headings.toArray()) {
    const text = cleanText($(heading).text());
    if (patterns.some((pattern) => pattern.test(text))) {
      return $(heading).closest('section, div');
    }
  }
  return null;
};

const extractChipsByHeading = (html: string, headingPatterns: RegExp[], subheadingPatterns?: RegExp[]) => {
  const $ = load(html);
  const section = findSectionByHeading($, headingPatterns);
  if (!section) {
    return [];
  }
  if (!subheadingPatterns?.length) {
    const items = section
      .find('li, [data-test*="chip"], [class*="chip"], [class*="tag"]')
      .map((_, el) => extractChipText($(el).text()))
      .get()
      .filter(Boolean);
    return items;
  }

  const subheadings = section.find('h3, h4, h5, strong');
  for (const subheading of subheadings.toArray()) {
    const text = cleanText($(subheading).text());
    if (!subheadingPatterns.some((pattern) => pattern.test(text))) {
      continue;
    }
    const container = $(subheading).closest('div, section');
    const items = container
      .find('li, [data-test*="chip"], [class*="chip"], [class*="tag"]')
      .map((_, el) => extractChipText($(el).text()))
      .get()
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }

  return [];
};

const extractSectionTextByHeading = (html: string, headingPatterns: RegExp[]) => {
  const $ = load(html);
  const section = findSectionByHeading($, headingPatterns);
  if (!section) {
    return undefined;
  }
  const text = cleanText(
    section
      .find('p')
      .map((_, el) => $(el).text())
      .get()
      .join(' '),
  );
  return text || undefined;
};

const collectDetails = (html: string): JobDetails | undefined => {
  const expectedTech = extractChipsByHeading(html, [/Technologies we use/i, /Technologie/i], [
    /Expected/i,
    /Wymagane/i,
  ]);
  const optionalTech = extractChipsByHeading(html, [/Technologies we use/i, /Technologie/i], [
    /Optional/i,
    /Mile widziane/i,
  ]);
  const allTech =
    expectedTech.length || optionalTech.length
      ? Array.from(new Set([...expectedTech, ...optionalTech]))
      : extractChipsByHeading(html, [/Technologies we use/i, /Technologie/i]);

  const workModes = extractChips(html, ['[data-test="offer-work-modes"]', '[data-test="offer-workmode"]']);
  const contractTypes = extractChips(html, ['[data-test="offer-contracts"]', '[data-test="offer-contracts-types"]']);
  const positionLevels = extractChips(html, ['[data-test="offer-position-levels"]']);
  const workSchedules = extractChips(html, ['[data-test="offer-work-schedules"]']);
  const benefits = extractChips(html, ['[data-test="section-benefits"]', '[data-test="offer-benefits"]']);
  const companyDescription = extractSectionTextByHeading(html, [/About company/i, /O firmie/i, /O pracodawcy/i]);

  if (
    !allTech.length &&
    !workModes.length &&
    !contractTypes.length &&
    !positionLevels.length &&
    !workSchedules.length &&
    !benefits.length &&
    !companyDescription
  ) {
    return undefined;
  }

  return {
    technologies:
      allTech.length || expectedTech.length || optionalTech.length
        ? {
            all: allTech.length ? allTech : undefined,
            required: expectedTech.length ? expectedTech : undefined,
            niceToHave: optionalTech.length ? optionalTech : undefined,
          }
        : undefined,
    workModes: workModes.length ? workModes : undefined,
    contractTypes: contractTypes.length ? contractTypes : undefined,
    positionLevels: positionLevels.length ? positionLevels : undefined,
    workSchedules: workSchedules.length ? workSchedules : undefined,
    benefits: benefits.length ? benefits : undefined,
    companyDescription,
  };
};

const normalizeSalary = (job: JsonLdJob | null) => {
  if (!job) {
    return null;
  }
  const currency = job.baseSalary?.currency ?? '';
  const value = job.baseSalary?.value;
  if (!value) {
    return null;
  }
  const min = value.minValue ?? value.value;
  const max = value.maxValue;
  const unit = value.unitText ?? '';
  if (min && max) {
    return `${min}-${max} ${currency} ${unit}`.trim();
  }
  if (min) {
    return `${min} ${currency} ${unit}`.trim();
  }
  return null;
};

const findJobPosting = (blocks: string[]) => {
  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as JsonLdJob | JsonLdJob[] | { ['@graph']?: JsonLdJob[] };
      const graph = (data as { ['@graph']?: JsonLdJob[] })['@graph'];
      const list = Array.isArray(data)
        ? data
        : Array.isArray(graph)
          ? graph
          : [data as JsonLdJob];
      const posting = list.find((item) => item['@type'] === 'JobPosting');
      if (posting) {
        return posting;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const fallbackTitle = (html: string) => {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? toText(match[1]) : 'Unknown title';
};

const extractSourceId = (url: string) => {
  const match = url.match(/,oferta,(\d+)/);
  return match?.[1] ?? null;
};

export const parsePracujPl = (pages: RawPage[]): ParsedJob[] => {
  return pages.map((page) => {
    const jsonLd = findJobPosting(extractJsonLdBlocks(page.html));
    const employmentType = Array.isArray(jsonLd?.employmentType)
      ? jsonLd?.employmentType.join(', ')
      : jsonLd?.employmentType;

    const location = jsonLd?.jobLocation?.[0]?.address?.addressLocality;
    const region = jsonLd?.jobLocation?.[0]?.address?.addressRegion;
    const combinedLocation = [location, region].filter(Boolean).join(', ');

    const title =
      jsonLd?.title?.trim() ||
      extractTextBySelectors(page.html, ['[data-test="offer-title"]', 'h1']) ||
      fallbackTitle(page.html);
    const company =
      jsonLd?.hiringOrganization?.name?.trim() ||
      extractTextBySelectors(page.html, ['[data-test="offer-company"]', '[data-test="text-company-name"]']) ||
      undefined;
    const locationText =
      combinedLocation ||
      extractTextBySelectors(page.html, ['[data-test="offer-location"]', '[data-test="text-region"]']) ||
      undefined;
    const description =
      cleanText(toText(jsonLd?.description)) ||
      extractTextBySelectors(page.html, [
        '[data-test="section-offer-description"]',
        '[data-test="offer-description"]',
        '[data-test="text-job-description"]',
      ]) ||
      'No description found';
    const salary =
      normalizeSalary(jsonLd) ||
      extractTextBySelectors(page.html, ['[data-test="offer-salary"]', '[data-test="text-offer-salary"]']) ||
      undefined;
    const requirements =
      extractListBySelectors(page.html, [
        '[data-test="section-offer-requirements"]',
        '[data-test="offer-requirements"]',
        '[data-test="section-offer-expected"]',
      ]) || [];
    const details = collectDetails(page.html);

    return {
      title,
      company,
      location: locationText,
      description,
      url: page.url,
      salary,
      employmentType: employmentType?.toString(),
      sourceId: extractSourceId(page.url) ?? undefined,
      requirements,
      details,
    };
  });
};
