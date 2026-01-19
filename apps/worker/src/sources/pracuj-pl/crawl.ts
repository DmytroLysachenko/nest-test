import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { chromium, type Cookie, type Page } from 'playwright';

import type { Logger } from 'pino';

import type { ListingJobSummary, RawPage } from '../types';

import { defaultListingUrl, PRACUJ_DOMAIN, PRACUJ_JOB_PATH } from './constants';
import { extractListingSummaries } from './listing';

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

const swapHost = (value: string, host?: string) => {
  if (!host) {
    return value;
  }
  try {
    const url = new URL(value);
    url.host = host;
    return url.toString();
  } catch {
    return value;
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

const isBlockedPage = (html: string) => {
  return html.includes('cf_chl') || html.includes('Just a moment...');
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

type RawCookie = Cookie & {
  hostOnly?: boolean;
  session?: boolean;
  storeId?: string;
  id?: number;
  expirationDate?: number;
  sameSite?: string;
  url?: string;
};

const normalizeSameSite = (value: string | undefined): Cookie['sameSite'] | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.toLowerCase();
  if (normalized === 'lax') {
    return 'Lax';
  }
  if (normalized === 'strict') {
    return 'Strict';
  }
  if (normalized === 'none') {
    return 'None';
  }
  return undefined;
};

const normalizeCookie = (cookie: RawCookie): Cookie | null => {
  const name = cookie.name;
  const value = cookie.value;
  if (!name || !value) {
    return null;
  }

  const base: Cookie = {
    name,
    value,
    domain: cookie.domain ?? '',
    path: cookie.path ?? '/',
    expires: cookie.expires ?? cookie.expirationDate ?? -1,
    httpOnly: cookie.httpOnly ?? false,
    secure: cookie.secure ?? false,
    sameSite: normalizeSameSite(cookie.sameSite),
  };

  if (!base.domain && cookie.url) {
    return { ...base, url: cookie.url };
  }

  if (!base.domain) {
    return null;
  }

  return base;
};

const loadCookies = async (cookiesPath?: string, logger?: Logger): Promise<Cookie[] | null> => {
  if (!cookiesPath) {
    return null;
  }
  const resolved = resolve(process.cwd(), cookiesPath);
  try {
    const raw = await readFile(resolved, 'utf-8');
    const parsed = JSON.parse(raw) as { cookies?: RawCookie[] } | RawCookie[];
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.cookies) ? parsed.cookies : null;
    if (list) {
      const normalized = list.map(normalizeCookie).filter((item): item is Cookie => Boolean(item));
      const skipped = list.length - normalized.length;
      if (skipped) {
        logger?.warn({ skipped }, 'Skipped invalid cookies');
      }
      return normalized;
    }
    logger?.warn({ cookiesPath: resolved }, 'Cookies file did not contain an array');
  } catch (error) {
    logger?.warn({ cookiesPath: resolved, error }, 'Failed to load cookies file');
  }
  return null;
};

const humanizePage = async (page: Page, delayMs: number) => {
  const jitter = Math.max(250, Math.floor(delayMs / 3));
  await page.waitForTimeout(randomBetween(jitter, delayMs));
  await page.mouse.move(randomBetween(50, 400), randomBetween(50, 400));
  await page.mouse.wheel(0, randomBetween(200, 600));
  await page.waitForTimeout(randomBetween(jitter, delayMs));
};

const loadJobPage = async (
  page: Page,
  url: string,
  delayMs: number,
  humanize: boolean,
) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-test="offer-title"], h1', { timeout: 8000 }).catch(() => undefined);
  if (humanize) {
    await humanizePage(page, delayMs);
  } else {
    await page.waitForTimeout(delayMs);
  }
  return page.content();
};

export const crawlPracujPl = async (
  headless: boolean,
  listingUrl = defaultListingUrl,
  limit?: number,
  logger?: Logger,
  options?: {
    listingDelayMs?: number;
    detailDelayMs?: number;
    listingOnly?: boolean;
    detailHost?: string;
    detailCookiesPath?: string;
    detailHumanize?: boolean;
  },
): Promise<{
  pages: RawPage[];
  blockedUrls: string[];
  jobLinks: string[];
  listingHtml: string;
  listingData: unknown;
  listingSummaries: ListingJobSummary[];
}> => {
  const browser = await chromium.launch({ headless });
  const listingDelayMs = options?.listingDelayMs ?? 1500;
  const detailDelayMs = options?.detailDelayMs ?? 2000;
  const listingOnly = options?.listingOnly ?? false;
  const detailHost = options?.detailHost;
  const detailHumanize = options?.detailHumanize ?? false;

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
    await page.waitForTimeout(listingDelayMs);

    const hasNextData = await page.evaluate(() => Boolean(document.querySelector('#__NEXT_DATA__')));
    await page.waitForFunction(
      () => document.querySelectorAll('a[href*=",oferta,"]').length > 0 || Boolean(document.querySelector('#__NEXT_DATA__')),
      { timeout: 5000 },
    ).catch(() => undefined);

    const html = await page.content();
    const listingData = extractNextDataJson(html);
    const listingSummaries = listingData ? extractListingSummaries(listingData) : [];
    logger?.info(
      {
        listingUrl,
        finalUrl,
        status,
        htmlLength: html.length,
        hasNextData,
        title: await page.title(),
        listingSummaries: listingSummaries.length,
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

    const normalizedLinks = detailHost ? jobLinks.map((link) => swapHost(link, detailHost)) : jobLinks;
    const pages: RawPage[] = [];
    const blockedUrls: string[] = [];
    const detailCookies = await loadCookies(options?.detailCookiesPath, logger);
    if (detailCookies?.length) {
      try {
        await context.addCookies(detailCookies);
        logger?.info({ count: detailCookies.length }, 'Detail cookies loaded');
      } catch (error) {
        logger?.error({ error }, 'Failed to apply detail cookies');
      }
    }

    if (listingOnly) {
      await context.close();
      return {
        pages,
        blockedUrls,
        jobLinks: normalizedLinks,
        listingHtml: html,
        listingData,
        listingSummaries,
      };
    }

    for (const url of normalizedLinks) {
      const jobPage = await context.newPage();
      let html = await loadJobPage(jobPage, url, detailDelayMs, detailHumanize);
      if (isBlockedPage(html)) {
        logger?.warn({ url }, 'Detail page blocked, retrying once');
        await sleep(detailDelayMs + randomBetween(500, 1500));
        html = await loadJobPage(jobPage, url, detailDelayMs * 2, true);
      }
      if (isBlockedPage(html)) {
        blockedUrls.push(url);
      } else {
        pages.push({ url, html });
      }
      await jobPage.close();
      await sleep(Math.max(500, Math.floor(detailDelayMs / 2)));
    }

    await context.close();
    if (blockedUrls.length) {
      logger?.warn({ count: blockedUrls.length }, 'Blocked job pages detected (Cloudflare)');
    }

    return {
      pages,
      blockedUrls,
      jobLinks: normalizedLinks,
      listingHtml: html,
      listingData,
      listingSummaries,
    };
  } finally {
    await browser.close();
  }
};
