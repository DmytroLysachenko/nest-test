import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { load } from 'cheerio';
import { type Cookie, type Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import { defaultListingUrl, PRACUJ_DOMAIN, PRACUJ_JOB_PATH } from './constants';
import { extractListingSummaries } from './listing';

import type { Logger } from 'pino';
import type { DetailFetchDiagnostics, ListingJobSummary, RawPage } from '../types';

chromium.use(stealth());

const BROWSER_LAUNCH_TIMEOUT_MS = 30_000;
const PAGE_NAVIGATION_TIMEOUT_MS = 45_000;
const PAGE_READY_TIMEOUT_MS = 15_000;

type CrawlProgressEvent = {
  stage:
    | 'listing_browser_launch_started'
    | 'listing_browser_launch_completed'
    | 'listing_navigation_started'
    | 'listing_navigation_completed'
    | 'listing_navigation_retry'
    | 'listing_ready_timeout'
    | 'detail_navigation_started'
    | 'detail_navigation_completed'
    | 'detail_navigation_failed';
  meta?: Record<string, unknown>;
};

type CrawlProgressReporter = (event: CrawlProgressEvent) => Promise<void> | void;

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

export const extractListingDomSignalsFromHtml = (html: string) => {
  const $ = load(html);
  const allHrefs = $('a[href*=",oferta,"]')
    .map((_, element) => $(element).attr('href') ?? '')
    .get()
    .filter(Boolean);
  const recommendedHrefs = $('[data-test="section-recommended-offers"] a[href*=",oferta,"]')
    .map((_, element) => $(element).attr('href') ?? '')
    .get()
    .filter(Boolean);
  const primarySectionHrefs = $('[data-test="section-offers"] a[href*=",oferta,"]')
    .map((_, element) => $(element).attr('href') ?? '')
    .get()
    .filter(Boolean);

  const hasZeroOffers = $('[data-test="zero-offers-section"]').length > 0;
  const recommendedSet = new Set(extractJobLinks(recommendedHrefs));
  const primarySectionLinks = extractJobLinks(primarySectionHrefs);
  const primaryLinks =
    primarySectionLinks.length > 0
      ? primarySectionLinks
      : extractJobLinks(allHrefs).filter((href) => !recommendedSet.has(href));

  return {
    hasZeroOffers,
    primaryLinks,
    recommendedLinks: Array.from(recommendedSet),
  };
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

const isExpiredPage = (html: string) => {
  const normalized = html.toLowerCase();
  return (
    normalized.includes('oferta jest nieaktywna') ||
    normalized.includes('ta oferta wygasła') ||
    normalized.includes('nie znaleźliśmy oferty, której szukasz')
  );
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

  // Random small mouse movements
  for (let i = 0; i < randomBetween(2, 5); i++) {
    await page.mouse.move(randomBetween(50, 600), randomBetween(50, 600), { steps: randomBetween(5, 15) });
    await page.waitForTimeout(randomBetween(100, 400));
  }

  await page.mouse.wheel(0, randomBetween(300, 800));
  await page.waitForTimeout(randomBetween(jitter, delayMs));

  // Maybe move mouse again
  if (Math.random() > 0.5) {
    await page.mouse.move(randomBetween(100, 500), randomBetween(100, 500), { steps: 10 });
  }

  await page.waitForTimeout(randomBetween(jitter, delayMs));
};

const acceptCookieBanner = async (page: Page, logger?: Logger) => {
  const selectors = [
    '#onetrust-accept-btn-handler',
    'button[id*="cookie"][id*="accept" i]',
    'button[class*="cookie"][class*="accept" i]',
    'button[aria-label*="cookie" i]',
    'button[data-test*="cookie" i]',
    'button[data-testid*="cookie" i]',
  ];

  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible()) {
        await locator.click({ timeout: 2000 });
        logger?.info({ selector }, 'Cookie banner dismissed');
        return;
      }
    } catch {
      continue;
    }
  }
};

const loadJobPage = async (page: Page, url: string, delayMs: number, humanize: boolean, logger?: Logger) => {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_NAVIGATION_TIMEOUT_MS });
  await acceptCookieBanner(page, logger);
  await page.waitForSelector('[data-test="offer-title"], h1', { timeout: 8000 }).catch(() => undefined);
  if (humanize) {
    await humanizePage(page, delayMs);
  } else {
    await page.waitForTimeout(delayMs);
  }
  const html = await page.content();
  const title = await page.title();
  return {
    html,
    status: response?.status(),
    finalUrl: page.url(),
    title,
  };
};

const emitProgress = async (reporter: CrawlProgressReporter | undefined, event: CrawlProgressEvent) => {
  if (!reporter) {
    return;
  }
  await reporter(event);
};

const loadListingPage = async (
  page: Page,
  url: string,
  delayMs: number,
  logger?: Logger,
  reporter?: CrawlProgressReporter,
  attempt = 1,
) => {
  await emitProgress(reporter, {
    stage: 'listing_navigation_started',
    meta: { url, attempt },
  });
  const navigationStartedAt = Date.now();
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: PAGE_NAVIGATION_TIMEOUT_MS,
  });
  await acceptCookieBanner(page, logger);
  await page.waitForTimeout(delayMs);

  const hasNextData = await page.evaluate(() => Boolean(document.querySelector('#__NEXT_DATA__')));
  const readyState = await page
    .waitForFunction(
      () =>
        document.querySelectorAll('a[href*=",oferta,"]').length > 0 ||
        Boolean(document.querySelector('#__NEXT_DATA__')) ||
        Boolean(document.querySelector('[data-test="zero-offers-section"]')),
      { timeout: PAGE_READY_TIMEOUT_MS },
    )
    .then(() => 'ready')
    .catch(() => 'timed_out');

  if (readyState === 'timed_out') {
    await emitProgress(reporter, {
      stage: 'listing_ready_timeout',
      meta: { url, attempt, timeoutMs: PAGE_READY_TIMEOUT_MS },
    });
  }

  const html = await page.content();
  const title = await page.title();
  const finalUrl = page.url();
  const domSignals = extractListingDomSignalsFromHtml(html);
  await emitProgress(reporter, {
    stage: 'listing_navigation_completed',
    meta: {
      url,
      attempt,
      status: response?.status() ?? null,
      finalUrl,
      durationMs: Date.now() - navigationStartedAt,
      hasNextData,
      primaryLinkCount: domSignals.primaryLinks.length,
      recommendedLinkCount: domSignals.recommendedLinks.length,
      hasZeroOffers: domSignals.hasZeroOffers,
      title,
    },
  });

  return {
    response,
    hasNextData,
    html,
    title,
    finalUrl,
    domSignals,
  };
};

export const crawlPracujPl = async (
  headless: boolean,
  listingUrl = defaultListingUrl,
  limit?: number,
  logger?: Logger,
  options?: {
    listingDelayMs?: number;
    listingCooldownMs?: number;
    detailDelayMs?: number;
    listingOnly?: boolean;
    detailHost?: string;
    detailCookiesPath?: string;
    detailHumanize?: boolean;
    profileDir?: string;
    skipUrls?: Set<string>;
    skipResolver?: (urls: string[]) => Promise<Set<string>>;
    onProgress?: CrawlProgressReporter;
  },
): Promise<{
  pages: RawPage[];
  blockedUrls: string[];
  jobLinks: string[];
  recommendedJobLinks: string[];
  hasZeroOffers: boolean;
  listingHtml: string;
  listingData: unknown;
  listingSummaries: ListingJobSummary[];
  detailDiagnostics: DetailFetchDiagnostics[];
}> => {
  const profileDir = options?.profileDir;
  await emitProgress(options?.onProgress, {
    stage: 'listing_browser_launch_started',
    meta: { profileDir: Boolean(profileDir) },
  });
  const browser = profileDir ? null : await chromium.launch({ headless, timeout: BROWSER_LAUNCH_TIMEOUT_MS });
  await emitProgress(options?.onProgress, {
    stage: 'listing_browser_launch_completed',
    meta: { profileDir: Boolean(profileDir) },
  });
  const listingDelayMs = options?.listingDelayMs ?? 1500;
  const listingCooldownMs = options?.listingCooldownMs ?? 0;
  const detailDelayMs = options?.detailDelayMs ?? 2000;
  const listingOnly = options?.listingOnly ?? false;
  const detailHost = options?.detailHost;
  const detailHumanize = options?.detailHumanize ?? false;

  try {
    const context = profileDir
      ? await chromium.launchPersistentContext(profileDir, {
          headless,
          timeout: BROWSER_LAUNCH_TIMEOUT_MS,
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          locale: 'pl-PL',
          timezoneId: 'Europe/Warsaw',
        })
      : await browser.newContext({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          locale: 'pl-PL',
          timezoneId: 'Europe/Warsaw',
        });
    context.setDefaultNavigationTimeout(PAGE_NAVIGATION_TIMEOUT_MS);
    context.setDefaultTimeout(PAGE_NAVIGATION_TIMEOUT_MS);
    let page = await context.newPage();
    let listingAttempt = 1;
    let listingLoad = await loadListingPage(
      page,
      listingUrl,
      listingDelayMs,
      logger,
      options?.onProgress,
      listingAttempt,
    );

    if (
      !listingLoad.domSignals.hasZeroOffers &&
      listingLoad.domSignals.primaryLinks.length === 0 &&
      !listingLoad.hasNextData &&
      !isBlockedPage(listingLoad.html)
    ) {
      listingAttempt += 1;
      await emitProgress(options?.onProgress, {
        stage: 'listing_navigation_retry',
        meta: { url: listingUrl, attempt: listingAttempt, reason: 'no_links_or_next_data' },
      });
      await page.close();
      page = await context.newPage();
      listingLoad = await loadListingPage(
        page,
        listingUrl,
        Math.max(listingDelayMs, 3000),
        logger,
        options?.onProgress,
        listingAttempt,
      );
    }

    const status = listingLoad.response?.status();
    const finalUrl = listingLoad.finalUrl;
    const hasNextData = listingLoad.hasNextData;
    const html = listingLoad.html;
    const listingData = extractNextDataJson(html);
    const listingSummaries = listingData ? extractListingSummaries(listingData) : [];
    logger?.info(
      {
        listingUrl,
        finalUrl,
        status,
        htmlLength: html.length,
        hasNextData,
        title: listingLoad.title,
        listingSummaries: listingSummaries.length,
      },
      'Listing page loaded',
    );

    const domLinks = listingLoad.domSignals;
    logger?.info(
      {
        primaryCount: domLinks.primaryLinks.length,
        recommendedCount: domLinks.recommendedLinks.length,
        hasZeroOffers: domLinks.hasZeroOffers,
      },
      'Listing links from DOM sections',
    );
    let jobLinks = limit ? domLinks.primaryLinks.slice(0, limit) : domLinks.primaryLinks;

    if (!jobLinks.length && !domLinks.hasZeroOffers) {
      const jobLinksFromData = extractJobLinksFromNextData(html);
      logger?.info({ count: jobLinksFromData.length }, 'Listing links from NEXT_DATA');
      jobLinks = limit ? jobLinksFromData.slice(0, limit) : jobLinksFromData;
    }

    if (!jobLinks.length && !domLinks.hasZeroOffers) {
      const hrefs = await page.$$eval('a[href]', (anchors) =>
        anchors.map((anchor) => (anchor instanceof HTMLAnchorElement ? anchor.href : '')),
      );
      const extracted = extractJobLinks(hrefs);
      jobLinks = limit ? extracted.slice(0, limit) : extracted;
      logger?.info({ count: jobLinks.length }, 'Listing links from anchors');
    }

    if (!jobLinks.length) {
      logger?.warn({ listingUrl, hasZeroOffers: domLinks.hasZeroOffers }, 'No primary job links found for listing');
    }

    const normalizedLinks = detailHost ? jobLinks.map((link) => swapHost(link, detailHost)) : jobLinks;
    const localSkipUrls = options?.skipUrls ?? new Set<string>();
    const resolvedSkipUrls = options?.skipResolver ? await options.skipResolver(normalizedLinks) : new Set<string>();
    const skipUrls = new Set<string>([...localSkipUrls, ...resolvedSkipUrls]);
    const detailTargets = normalizedLinks.filter((url) => !skipUrls.has(url));
    if (skipUrls.size) {
      logger?.info(
        { skipped: skipUrls.size, total: normalizedLinks.length },
        'Skipping detail fetch for cached offers',
      );
    }
    const pages: RawPage[] = [];
    const blockedUrls: string[] = [];
    const detailDiagnostics: DetailFetchDiagnostics[] = [];
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
        recommendedJobLinks: domLinks.recommendedLinks,
        hasZeroOffers: domLinks.hasZeroOffers,
        listingHtml: html,
        listingData,
        listingSummaries,
        detailDiagnostics,
      };
    }

    if (listingCooldownMs > 0) {
      await sleep(listingCooldownMs + randomBetween(500, 1500));
    }

    for (const url of detailTargets) {
      const jobPage = await context.newPage();
      try {
        await emitProgress(options?.onProgress, {
          stage: 'detail_navigation_started',
          meta: { url },
        });
        let result = await loadJobPage(jobPage, url, detailDelayMs, detailHumanize, logger);
        let blocked = isBlockedPage(result.html);
        let expired = isExpiredPage(result.html);

        detailDiagnostics.push({
          url,
          finalUrl: result.finalUrl,
          status: result.status,
          title: result.title,
          htmlLength: result.html.length,
          blocked,
          expired,
          attempt: 1,
        });

        if (blocked) {
          logger?.warn({ url, status: result.status }, 'Detail page blocked, retrying once');
          await sleep(detailDelayMs + randomBetween(500, 1500));
          result = await loadJobPage(jobPage, url, detailDelayMs * 2, true, logger);
          blocked = isBlockedPage(result.html);
          expired = isExpiredPage(result.html);
          detailDiagnostics.push({
            url,
            finalUrl: result.finalUrl,
            status: result.status,
            title: result.title,
            htmlLength: result.html.length,
            blocked,
            expired,
            attempt: 2,
          });
        }

        if (blocked) {
          blockedUrls.push(url);
        } else {
          pages.push({ url, html: result.html, isExpired: expired });
        }
        await emitProgress(options?.onProgress, {
          stage: 'detail_navigation_completed',
          meta: {
            url,
            finalUrl: result.finalUrl,
            status: result.status ?? null,
            blocked,
            expired,
          },
        });
      } catch (error) {
        detailDiagnostics.push({
          url,
          attempt: 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await emitProgress(options?.onProgress, {
          stage: 'detail_navigation_failed',
          meta: {
            url,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        logger?.error({ url, error }, 'Failed to load detail page');
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
      recommendedJobLinks: domLinks.recommendedLinks,
      hasZeroOffers: domLinks.hasZeroOffers,
      listingHtml: html,
      listingData,
      listingSummaries,
      detailDiagnostics,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
