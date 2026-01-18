import { chromium } from 'playwright';

import type { Logger } from 'pino';

import type { RawPage } from '../types';

import { defaultListingUrl, PRACUJ_DOMAIN, PRACUJ_JOB_PATH } from './constants';

const toAbsoluteUrl = (href: string) => {
  try {
    const url = new URL(href);
    return url.toString();
  } catch {
    return null;
  }
};

const normalizeJobUrl = (value: string) => {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
};

const isJobLink = (href: string) => {
  if (!href.includes(PRACUJ_DOMAIN) || !href.includes(PRACUJ_JOB_PATH)) {
    return false;
  }
  return href.includes(',oferta,');
};

const extractJobLinks = (hrefs: string[]) => {
  const urls = hrefs
    .map((href) => toAbsoluteUrl(href))
    .filter((value): value is string => Boolean(value))
    .filter(isJobLink)
    .map((value) => normalizeJobUrl(value))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(urls));
};

const extractNextDataJson = (html: string) => {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1]) as unknown;
  } catch {
    return null;
  }
};

const collectJobUrls = (node: unknown, results: Set<string>) => {
  if (!node) {
    return;
  }
  if (typeof node === 'string') {
    if (isJobLink(node)) {
      const normalized = normalizeJobUrl(node);
      if (normalized) {
        results.add(normalized);
      }
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectJobUrls(item, results));
    return;
  }
  if (typeof node === 'object') {
    Object.values(node as Record<string, unknown>).forEach((value) => collectJobUrls(value, results));
  }
};

const extractJobLinksFromNextData = (html: string) => {
  const data = extractNextDataJson(html);
  if (!data) {
    return [];
  }
  const results = new Set<string>();
  collectJobUrls(data, results);
  return Array.from(results);
};

export const crawlPracujPl = async (
  headless: boolean,
  listingUrl = defaultListingUrl,
  limit?: number,
  logger?: Logger,
): Promise<RawPage[]> => {
  const browser = await chromium.launch({ headless });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
    });
    const page = await context.newPage();
    const response = await page.goto(listingUrl, { waitUntil: 'domcontentloaded' });

    const status = response?.status();
    const finalUrl = page.url();
    await page.waitForTimeout(1500);

    const hasNextData = await page.evaluate(() => Boolean(document.querySelector('#__NEXT_DATA__')));
    await page.waitForFunction(
      () => document.querySelectorAll('a[href*=",oferta,"]').length > 0 || Boolean(document.querySelector('#__NEXT_DATA__')),
      { timeout: 5000 },
    ).catch(() => undefined);

    const html = await page.content();
    logger?.info(
      {
        listingUrl,
        finalUrl,
        status,
        htmlLength: html.length,
        hasNextData,
        title: await page.title(),
      },
      'Listing page loaded',
    );

    const jobLinksFromData = extractJobLinksFromNextData(html);
    logger?.info({ count: jobLinksFromData.length }, 'Listing links from NEXT_DATA');
    let jobLinks = limit ? jobLinksFromData.slice(0, limit) : jobLinksFromData;

    if (!jobLinks.length) {
      const hrefs = await page.$$eval('a[href]', (anchors) =>
        anchors.map((anchor) => (anchor instanceof HTMLAnchorElement ? anchor.href : '')),
      );
      const extracted = extractJobLinks(hrefs);
      jobLinks = limit ? extracted.slice(0, limit) : extracted;
      logger?.info({ count: jobLinks.length }, 'Listing links from anchors');
    }

    if (!jobLinks.length) {
      logger?.warn({ listingUrl }, 'No job links found for listing');
    }

    const pages: RawPage[] = [];

    for (const url of jobLinks) {
      const jobPage = await browser.newPage();
      await jobPage.goto(url, { waitUntil: 'domcontentloaded' });
      const html = await jobPage.content();
      pages.push({ url, html });
      await jobPage.close();
    }

    await context.close();
    return pages;
  } finally {
    await browser.close();
  }
};
