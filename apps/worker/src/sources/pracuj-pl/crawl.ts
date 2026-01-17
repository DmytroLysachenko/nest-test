import { chromium } from 'playwright';

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
    .filter(isJobLink);

  return Array.from(new Set(urls));
};

export const crawlPracujPl = async (
  headless: boolean,
  listingUrl = defaultListingUrl,
  limit = 10,
): Promise<RawPage[]> => {
  const browser = await chromium.launch({ headless });

  try {
    const page = await browser.newPage();
    await page.goto(listingUrl, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.$$eval('a[href]', (anchors) =>
      anchors.map((anchor) => (anchor instanceof HTMLAnchorElement ? anchor.href : '')),
    );
    const jobLinks = extractJobLinks(hrefs).slice(0, limit);
    const pages: RawPage[] = [];

    for (const url of jobLinks) {
      const jobPage = await browser.newPage();
      await jobPage.goto(url, { waitUntil: 'domcontentloaded' });
      const html = await jobPage.content();
      pages.push({ url, html });
      await jobPage.close();
    }

    return pages;
  } finally {
    await browser.close();
  }
};
