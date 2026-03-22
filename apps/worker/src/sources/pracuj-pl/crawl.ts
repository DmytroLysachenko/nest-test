import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { load } from 'cheerio';
import { type Browser, type BrowserContext, type Cookie, type Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import { defaultListingUrl, PRACUJ_DOMAIN, PRACUJ_JOB_PATH } from './constants';
import { extractListingSummaries } from './listing';

import type { Logger } from 'pino';
import type { DetailFetchDiagnostics, ListingJobSummary, RawPage } from '../types';

chromium.use(stealth());

const HTTP_REQUEST_TIMEOUT_MS = 20_000;
const HTTP_RETRY_TIMEOUT_MS = 30_000;
const BROWSER_LAUNCH_TIMEOUT_MS = 60_000;
const PAGE_NAVIGATION_TIMEOUT_MS = 45_000;
const PAGE_READY_TIMEOUT_MS = 15_000;
const PLAYWRIGHT_BROWSER_CHANNEL = 'chromium';
const PLAYWRIGHT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-features=site-per-process,Translate,BackForwardCache',
  '--no-first-run',
  '--no-zygote',
];
const DEFAULT_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

type CrawlProgressEvent = {
  stage:
    | 'listing_http_fetch_started'
    | 'listing_http_fetch_completed'
    | 'listing_http_fetch_retry'
    | 'listing_http_fetch_failed'
    | 'listing_fallback_triggered'
    | 'listing_browser_launch_started'
    | 'listing_browser_launch_completed'
    | 'listing_browser_launch_failed'
    | 'listing_browser_navigation_started'
    | 'listing_browser_navigation_completed'
    | 'listing_browser_navigation_failed'
    | 'listing_browser_ready_timeout'
    | 'detail_http_fetch_started'
    | 'detail_http_fetch_completed'
    | 'detail_http_fetch_failed'
    | 'detail_fallback_triggered'
    | 'detail_browser_navigation_started'
    | 'detail_browser_navigation_completed'
    | 'detail_browser_navigation_failed';
  meta?: Record<string, unknown>;
};

type CrawlProgressReporter = (event: CrawlProgressEvent) => Promise<void> | void;

type RequestResult = {
  status: number | null;
  finalUrl: string;
  html: string;
  title: string;
  hasNextData: boolean;
  blocked: boolean;
  expired: boolean;
  htmlLength: number;
};

type ListingLoadResult = RequestResult & {
  domSignals: ReturnType<typeof extractListingDomSignalsFromHtml>;
};

type LoadedCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
};

type BrowserSession = {
  browser: Browser | null;
  context: BrowserContext;
};

const DEFAULT_HEADERS = {
  'user-agent': DEFAULT_BROWSER_USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'upgrade-insecure-requests': '1',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

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
    if (host.includes('://')) {
      const overrideOrigin = new URL(host);
      url.protocol = overrideOrigin.protocol;
      url.host = overrideOrigin.host;
    } else {
      url.host = host;
    }
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

const isBlockedPage = (html: string) => html.includes('cf_chl') || html.includes('Just a moment...');

const isExpiredPage = (html: string) => {
  const normalized = html.toLowerCase();
  return (
    normalized.includes('oferta jest nieaktywna') ||
    normalized.includes('ta oferta wygas') ||
    (normalized.includes('nie znale') && normalized.includes('oferty'))
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const emitProgress = async (reporter: CrawlProgressReporter | undefined, event: CrawlProgressEvent) => {
  if (!reporter) {
    return;
  }
  await reporter(event);
};

const extractTitleFromHtml = (html: string) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() ?? '';
};

const toLoadedCookie = (value: unknown): LoadedCookie | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const cookieValue = typeof candidate.value === 'string' ? candidate.value : '';
  if (!name || !cookieValue) {
    return null;
  }
  return {
    name,
    value: cookieValue,
    domain: typeof candidate.domain === 'string' ? candidate.domain : undefined,
    path: typeof candidate.path === 'string' ? candidate.path : undefined,
  };
};

const loadCookies = async (cookiesPath?: string, logger?: Logger): Promise<LoadedCookie[] | null> => {
  if (!cookiesPath) {
    return null;
  }
  const resolved = resolve(process.cwd(), cookiesPath);
  try {
    const raw = await readFile(resolved, 'utf-8');
    const parsed = JSON.parse(raw) as { cookies?: unknown[] } | unknown[];
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.cookies) ? parsed.cookies : null;
    if (!list) {
      logger?.warn({ cookiesPath: resolved }, 'Cookies file did not contain an array');
      return null;
    }
    const normalized = list.map((item) => toLoadedCookie(item)).filter((item): item is LoadedCookie => Boolean(item));
    const skipped = list.length - normalized.length;
    if (skipped) {
      logger?.warn({ skipped }, 'Skipped invalid cookies');
    }
    return normalized;
  } catch (error) {
    logger?.warn({ cookiesPath: resolved, error }, 'Failed to load cookies file');
    return null;
  }
};

const toPlaywrightCookie = (cookie: LoadedCookie): Cookie => ({
  name: cookie.name,
  value: cookie.value,
  domain: cookie.domain ?? '',
  path: cookie.path ?? '/',
  expires: -1,
  httpOnly: false,
  secure: false,
  sameSite: 'Lax',
});

const buildCookieHeader = (cookies: LoadedCookie[], targetUrl: string) => {
  if (!cookies.length) {
    return undefined;
  }
  let hostname = '';
  let pathname = '/';
  try {
    const parsed = new URL(targetUrl);
    hostname = parsed.hostname;
    pathname = parsed.pathname || '/';
  } catch {
    return undefined;
  }
  const pairs = cookies
    .filter((cookie) => {
      if (cookie.domain) {
        const normalizedDomain = cookie.domain.replace(/^\./, '').toLowerCase();
        if (!hostname.toLowerCase().endsWith(normalizedDomain)) {
          return false;
        }
      }
      if (cookie.path && !pathname.startsWith(cookie.path)) {
        return false;
      }
      return true;
    })
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  return pairs.length ? pairs.join('; ') : undefined;
};

const readSetCookieHeaders = (headers: Headers) => {
  const maybeGetSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof maybeGetSetCookie === 'function') {
    return maybeGetSetCookie.call(headers);
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
};

const storeResponseCookies = (cookieJar: LoadedCookie[], targetUrl: string, headers: Headers) => {
  const target = new URL(targetUrl);
  for (const rawCookie of readSetCookieHeaders(headers)) {
    const [pair, ...attributes] = rawCookie.split(';');
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      continue;
    }

    let domain = target.hostname;
    let path = '/';
    for (const attribute of attributes) {
      const [rawKey, rawValue = ''] = attribute.split('=');
      const key = rawKey.trim().toLowerCase();
      const parsedValue = rawValue.trim();
      if (key === 'domain' && parsedValue) {
        domain = parsedValue.replace(/^\./, '');
      }
      if (key === 'path' && parsedValue) {
        path = parsedValue;
      }
    }

    const existingIndex = cookieJar.findIndex(
      (cookie) => cookie.name === name && (cookie.domain ?? '') === domain && (cookie.path ?? '/') === path,
    );
    const nextCookie: LoadedCookie = { name, value, domain, path };
    if (existingIndex >= 0) {
      cookieJar[existingIndex] = nextCookie;
    } else {
      cookieJar.push(nextCookie);
    }
  }
};

const fetchHtml = async (
  url: string,
  timeoutMs: number,
  logger?: Logger,
  cookieJar: LoadedCookie[] = [],
  extraHeaders?: Record<string, string>,
): Promise<RequestResult> => {
  const startedAt = Date.now();
  let currentUrl = url;
  let redirectCount = 0;
  let response: Response | null = null;

  while (redirectCount < 5) {
    const headers = {
      ...DEFAULT_HEADERS,
      ...extraHeaders,
    } as Record<string, string>;
    const cookieHeader = buildCookieHeader(cookieJar, currentUrl);
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }

    response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    storeResponseCookies(cookieJar, currentUrl, response.headers);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        break;
      }
      currentUrl = new URL(location, currentUrl).toString();
      redirectCount += 1;
      continue;
    }
    break;
  }

  if (!response) {
    throw new Error(`Failed to fetch ${url}`);
  }

  const html = await response.text();
  const result: RequestResult = {
    status: response.status,
    finalUrl: currentUrl,
    html,
    title: extractTitleFromHtml(html),
    hasNextData: Boolean(extractNextDataJson(html)),
    blocked: isBlockedPage(html),
    expired: isExpiredPage(html),
    htmlLength: html.length,
  };
  logger?.debug(
    {
      url,
      finalUrl: result.finalUrl,
      status: result.status,
      durationMs: Date.now() - startedAt,
      blocked: result.blocked,
      hasNextData: result.hasNextData,
    },
    'Fetched Pracuj HTML',
  );
  return result;
};

const humanizePage = async (page: Page, delayMs: number) => {
  const jitter = Math.max(250, Math.floor(delayMs / 3));

  for (let index = 0; index < randomBetween(2, 5); index += 1) {
    await page.mouse.move(randomBetween(50, 600), randomBetween(50, 600), {
      steps: randomBetween(5, 15),
    });
    await page.waitForTimeout(randomBetween(100, 400));
  }

  await page.mouse.wheel(0, randomBetween(300, 800));
  await page.waitForTimeout(randomBetween(jitter, delayMs));

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

const createBrowserSession = async (
  headless: boolean,
  profileDir: string | undefined,
  cookies: LoadedCookie[],
  logger?: Logger,
  reporter?: CrawlProgressReporter,
) => {
  const startedAt = Date.now();
  const launchOptions = {
    channel: PLAYWRIGHT_BROWSER_CHANNEL,
    headless,
    timeout: BROWSER_LAUNCH_TIMEOUT_MS,
    args: PLAYWRIGHT_LAUNCH_ARGS,
  } as const;
  await emitProgress(reporter, {
    stage: 'listing_browser_launch_started',
    meta: {
      channel: PLAYWRIGHT_BROWSER_CHANNEL,
      headless,
      profileDir: Boolean(profileDir),
      timeoutMs: BROWSER_LAUNCH_TIMEOUT_MS,
      args: PLAYWRIGHT_LAUNCH_ARGS,
    },
  });

  try {
    const browser = profileDir ? null : await chromium.launch(launchOptions);
    const context = profileDir
      ? await chromium.launchPersistentContext(profileDir, {
          ...launchOptions,
          userAgent: DEFAULT_BROWSER_USER_AGENT,
          locale: 'pl-PL',
          timezoneId: 'Europe/Warsaw',
        })
      : await browser.newContext({
          userAgent: DEFAULT_BROWSER_USER_AGENT,
          locale: 'pl-PL',
          timezoneId: 'Europe/Warsaw',
          extraHTTPHeaders: DEFAULT_HEADERS,
        });

    context.setDefaultNavigationTimeout(PAGE_NAVIGATION_TIMEOUT_MS);
    context.setDefaultTimeout(PAGE_NAVIGATION_TIMEOUT_MS);

    if (cookies.length) {
      try {
        await context.addCookies(cookies.map((cookie) => toPlaywrightCookie(cookie)));
      } catch (error) {
        logger?.warn({ error }, 'Failed to apply cookies to browser context');
      }
    }

    await emitProgress(reporter, {
      stage: 'listing_browser_launch_completed',
      meta: {
        channel: PLAYWRIGHT_BROWSER_CHANNEL,
        headless,
        profileDir: Boolean(profileDir),
        durationMs: Date.now() - startedAt,
        args: PLAYWRIGHT_LAUNCH_ARGS,
      },
    });

    return { browser, context } satisfies BrowserSession;
  } catch (error) {
    await emitProgress(reporter, {
      stage: 'listing_browser_launch_failed',
      meta: {
        channel: PLAYWRIGHT_BROWSER_CHANNEL,
        error: error instanceof Error ? error.message : 'Unknown browser launch error',
        durationMs: Date.now() - startedAt,
        args: PLAYWRIGHT_LAUNCH_ARGS,
      },
    });
    throw error;
  }
};

const closeBrowserSession = async (session: BrowserSession | null, logger?: Logger) => {
  if (!session) {
    return;
  }
  try {
    await session.context.close();
  } catch (error) {
    logger?.warn({ error }, 'Failed to close browser context');
  }
  if (session.browser) {
    try {
      await session.browser.close();
    } catch (error) {
      logger?.warn({ error }, 'Failed to close browser');
    }
  }
};

const loadListingPageHttp = async (
  url: string,
  timeoutMs: number,
  logger?: Logger,
  reporter?: CrawlProgressReporter,
  attempt = 1,
  cookieJar?: LoadedCookie[],
) => {
  await emitProgress(reporter, {
    stage: 'listing_http_fetch_started',
    meta: { url, attempt, timeoutMs },
  });
  const startedAt = Date.now();
  try {
    const result = await fetchHtml(url, timeoutMs, logger, cookieJar ?? []);
    const domSignals = extractListingDomSignalsFromHtml(result.html);
    await emitProgress(reporter, {
      stage: 'listing_http_fetch_completed',
      meta: {
        url,
        attempt,
        status: result.status,
        finalUrl: result.finalUrl,
        durationMs: Date.now() - startedAt,
        htmlLength: result.htmlLength,
        hasNextData: result.hasNextData,
        primaryLinkCount: domSignals.primaryLinks.length,
        recommendedLinkCount: domSignals.recommendedLinks.length,
        hasZeroOffers: domSignals.hasZeroOffers,
        blocked: result.blocked,
        title: result.title,
      },
    });
    return {
      ...result,
      domSignals,
    } satisfies ListingLoadResult;
  } catch (error) {
    await emitProgress(reporter, {
      stage: 'listing_http_fetch_failed',
      meta: {
        url,
        attempt,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown listing fetch error',
      },
    });
    throw error;
  }
};

const loadListingPageBrowser = async (
  session: BrowserSession,
  url: string,
  delayMs: number,
  logger?: Logger,
  reporter?: CrawlProgressReporter,
  attempt = 1,
) => {
  await emitProgress(reporter, {
    stage: 'listing_browser_navigation_started',
    meta: { url, attempt, delayMs },
  });
  const startedAt = Date.now();
  const page = await session.context.newPage();
  try {
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
        stage: 'listing_browser_ready_timeout',
        meta: { url, attempt, timeoutMs: PAGE_READY_TIMEOUT_MS },
      });
    }

    const html = await page.content();
    const result: ListingLoadResult = {
      status: response?.status() ?? null,
      finalUrl: page.url(),
      html,
      title: await page.title(),
      hasNextData,
      blocked: isBlockedPage(html),
      expired: isExpiredPage(html),
      htmlLength: html.length,
      domSignals: extractListingDomSignalsFromHtml(html),
    };

    await emitProgress(reporter, {
      stage: 'listing_browser_navigation_completed',
      meta: {
        url,
        attempt,
        status: result.status,
        finalUrl: result.finalUrl,
        durationMs: Date.now() - startedAt,
        htmlLength: result.htmlLength,
        hasNextData: result.hasNextData,
        primaryLinkCount: result.domSignals.primaryLinks.length,
        recommendedLinkCount: result.domSignals.recommendedLinks.length,
        hasZeroOffers: result.domSignals.hasZeroOffers,
        blocked: result.blocked,
        title: result.title,
      },
    });

    return result;
  } catch (error) {
    await emitProgress(reporter, {
      stage: 'listing_browser_navigation_failed',
      meta: {
        url,
        attempt,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown listing browser error',
      },
    });
    throw error;
  } finally {
    await page.close().catch(() => undefined);
  }
};

const loadDetailPageHttp = async (
  url: string,
  timeoutMs: number,
  logger?: Logger,
  reporter?: CrawlProgressReporter,
  attempt = 1,
  cookieJar?: LoadedCookie[],
  extraHeaders?: Record<string, string>,
) => {
  await emitProgress(reporter, {
    stage: 'detail_http_fetch_started',
    meta: { url, attempt, timeoutMs },
  });
  const startedAt = Date.now();
  try {
    const result = await fetchHtml(url, timeoutMs, logger, cookieJar ?? [], extraHeaders);
    await emitProgress(reporter, {
      stage: 'detail_http_fetch_completed',
      meta: {
        url,
        attempt,
        status: result.status,
        finalUrl: result.finalUrl,
        durationMs: Date.now() - startedAt,
        htmlLength: result.htmlLength,
        blocked: result.blocked,
        expired: result.expired,
        hasNextData: result.hasNextData,
        title: result.title,
      },
    });
    return result;
  } catch (error) {
    await emitProgress(reporter, {
      stage: 'detail_http_fetch_failed',
      meta: {
        url,
        attempt,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown detail fetch error',
      },
    });
    throw error;
  }
};

const loadDetailPageBrowser = async (
  session: BrowserSession,
  url: string,
  delayMs: number,
  humanize: boolean,
  logger?: Logger,
  reporter?: CrawlProgressReporter,
  attempt = 1,
) => {
  await emitProgress(reporter, {
    stage: 'detail_browser_navigation_started',
    meta: { url, attempt, delayMs, humanize },
  });
  const startedAt = Date.now();
  const page = await session.context.newPage();
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_NAVIGATION_TIMEOUT_MS,
    });
    await acceptCookieBanner(page, logger);
    await page
      .waitForSelector('[data-test="offer-title"], [data-test="text-positionName"], h1', {
        timeout: 8_000,
      })
      .catch(() => undefined);
    if (humanize) {
      await humanizePage(page, delayMs);
    } else {
      await page.waitForTimeout(delayMs);
    }
    const html = await page.content();
    const result: RequestResult = {
      status: response?.status() ?? null,
      finalUrl: page.url(),
      html,
      title: await page.title(),
      hasNextData: Boolean(extractNextDataJson(html)),
      blocked: isBlockedPage(html),
      expired: isExpiredPage(html),
      htmlLength: html.length,
    };

    await emitProgress(reporter, {
      stage: 'detail_browser_navigation_completed',
      meta: {
        url,
        attempt,
        status: result.status,
        finalUrl: result.finalUrl,
        durationMs: Date.now() - startedAt,
        htmlLength: result.htmlLength,
        blocked: result.blocked,
        expired: result.expired,
        hasNextData: result.hasNextData,
        title: result.title,
      },
    });

    return result;
  } catch (error) {
    await emitProgress(reporter, {
      stage: 'detail_browser_navigation_failed',
      meta: {
        url,
        attempt,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown detail browser error',
      },
    });
    throw error;
  } finally {
    await page.close().catch(() => undefined);
  }
};

const shouldRetryHttpListing = (result: ListingLoadResult) =>
  !result.domSignals.hasZeroOffers &&
  result.domSignals.primaryLinks.length === 0 &&
  !result.hasNextData &&
  !result.blocked;

const shouldFallbackListing = (result: ListingLoadResult) =>
  result.blocked || (result.status !== null && result.status >= 400) || shouldRetryHttpListing(result);

const shouldFallbackDetail = (result: RequestResult) =>
  result.blocked || (result.status !== null && result.status >= 400);

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
  const listingDelayMs = options?.listingDelayMs ?? 1500;
  const listingCooldownMs = options?.listingCooldownMs ?? 0;
  const detailDelayMs = options?.detailDelayMs ?? 2000;
  const detailHumanize = options?.detailHumanize ?? false;
  const listingOnly = options?.listingOnly ?? false;
  const detailHost = options?.detailHost;
  const cookieJar = (await loadCookies(options?.detailCookiesPath, logger)) ?? [];
  let browserSession: BrowserSession | null = null;

  const ensureBrowserSession = async () => {
    if (!browserSession) {
      browserSession = await createBrowserSession(
        headless,
        options?.profileDir,
        cookieJar,
        logger,
        options?.onProgress,
      );
    }
    return browserSession;
  };

  try {
    let listingAttempt = 1;
    let listingMethod: 'http' | 'browser' = 'http';
    let listingLoad = await loadListingPageHttp(
      listingUrl,
      HTTP_REQUEST_TIMEOUT_MS,
      logger,
      options?.onProgress,
      listingAttempt,
      cookieJar,
    );

    if (shouldRetryHttpListing(listingLoad)) {
      listingAttempt += 1;
      await emitProgress(options?.onProgress, {
        stage: 'listing_http_fetch_retry',
        meta: { url: listingUrl, attempt: listingAttempt, reason: 'no_links_or_next_data' },
      });
      await sleep(Math.max(listingDelayMs, 1000));
      listingLoad = await loadListingPageHttp(
        listingUrl,
        HTTP_RETRY_TIMEOUT_MS,
        logger,
        options?.onProgress,
        listingAttempt,
        cookieJar,
      );
    }

    if (shouldFallbackListing(listingLoad)) {
      const fallbackReason = listingLoad.blocked
        ? 'http_blocked'
        : listingLoad.status !== null && listingLoad.status >= 400
          ? `http_status_${listingLoad.status}`
          : 'http_missing_signals';
      logger?.warn(
        {
          listingUrl,
          status: listingLoad.status,
          blocked: listingLoad.blocked,
          hasNextData: listingLoad.hasNextData,
          primaryLinks: listingLoad.domSignals.primaryLinks.length,
          recommendedLinks: listingLoad.domSignals.recommendedLinks.length,
          hasZeroOffers: listingLoad.domSignals.hasZeroOffers,
          fallbackReason,
        },
        'Falling back to browser for listing page',
      );
      await emitProgress(options?.onProgress, {
        stage: 'listing_fallback_triggered',
        meta: {
          url: listingUrl,
          attempt: listingAttempt,
          reason: fallbackReason,
          status: listingLoad.status,
          blocked: listingLoad.blocked,
        },
      });
      listingLoad = await loadListingPageBrowser(
        await ensureBrowserSession(),
        listingUrl,
        Math.max(listingDelayMs, 2500),
        logger,
        options?.onProgress,
        listingAttempt,
      );
      listingMethod = 'browser';
    }

    const html = listingLoad.html;
    const listingData = extractNextDataJson(html);
    const listingSummaries = listingData ? extractListingSummaries(listingData) : [];
    logger?.info(
      {
        listingUrl,
        finalUrl: listingLoad.finalUrl,
        status: listingLoad.status,
        htmlLength: html.length,
        hasNextData: listingLoad.hasNextData,
        title: listingLoad.title,
        blocked: listingLoad.blocked,
        listingSummaries: listingSummaries.length,
        transport: listingMethod,
      },
      'Listing page loaded',
    );

    const domLinks = listingLoad.domSignals;
    logger?.info(
      {
        primaryCount: domLinks.primaryLinks.length,
        recommendedCount: domLinks.recommendedLinks.length,
        hasZeroOffers: domLinks.hasZeroOffers,
        transport: listingMethod,
      },
      'Listing links from DOM sections',
    );
    let jobLinks = limit ? domLinks.primaryLinks.slice(0, limit) : domLinks.primaryLinks;

    if (!jobLinks.length && !domLinks.hasZeroOffers) {
      const jobLinksFromData = extractJobLinksFromNextData(html);
      logger?.info({ count: jobLinksFromData.length, transport: listingMethod }, 'Listing links from NEXT_DATA');
      jobLinks = limit ? jobLinksFromData.slice(0, limit) : jobLinksFromData;
    }

    if (!jobLinks.length && !domLinks.hasZeroOffers) {
      logger?.warn(
        {
          listingUrl,
          hasZeroOffers: domLinks.hasZeroOffers,
          blocked: listingLoad.blocked,
          status: listingLoad.status,
          transport: listingMethod,
        },
        'No primary job links found for listing',
      );
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
    if (listingOnly) {
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
      let fallbackReason: string | null = null;
      try {
        const extraHeaders: Record<string, string> = {};
        const cookieHeader = buildCookieHeader(cookieJar, url);
        if (cookieHeader) {
          extraHeaders.cookie = cookieHeader;
        }

        let result = await loadDetailPageHttp(
          url,
          HTTP_REQUEST_TIMEOUT_MS,
          logger,
          options?.onProgress,
          1,
          cookieJar,
          extraHeaders,
        );
        let blocked = result.blocked;
        let expired = result.expired;
        let transport: 'http' | 'browser' = 'http';

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

        if (shouldFallbackDetail(result)) {
          fallbackReason = result.blocked
            ? 'http_blocked'
            : result.status !== null && result.status >= 400
              ? `http_status_${result.status}`
              : 'http_unusable';
          logger?.warn(
            {
              url,
              status: result.status,
              blocked: result.blocked,
              title: result.title,
              fallbackReason,
            },
            'Falling back to browser for detail page',
          );
          await emitProgress(options?.onProgress, {
            stage: 'detail_fallback_triggered',
            meta: {
              url,
              attempt: 1,
              reason: fallbackReason,
              status: result.status,
              blocked: result.blocked,
            },
          });
          await sleep(detailDelayMs + randomBetween(500, 1500));
          result = await loadDetailPageBrowser(
            await ensureBrowserSession(),
            url,
            detailDelayMs * 2,
            true,
            logger,
            options?.onProgress,
            2,
          );
          blocked = result.blocked;
          expired = result.expired;
          transport = 'browser';
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
          logger?.warn(
            {
              url,
              status: result.status,
              finalUrl: result.finalUrl,
              title: result.title,
              fallbackReason,
              transport,
            },
            'Detail page remained blocked after all attempts',
          );
        } else {
          pages.push({ url, html: result.html, isExpired: expired });
          logger?.info(
            {
              url,
              status: result.status,
              finalUrl: result.finalUrl,
              title: result.title,
              expired,
              transport,
            },
            'Detail page fetched successfully',
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (!fallbackReason) {
          fallbackReason = 'http_error';
          logger?.warn({ url, error: errorMessage }, 'HTTP detail fetch errored, attempting browser fallback');
          await emitProgress(options?.onProgress, {
            stage: 'detail_fallback_triggered',
            meta: {
              url,
              attempt: 1,
              reason: fallbackReason,
              error: errorMessage,
            },
          });
          try {
            const fallbackResult = await loadDetailPageBrowser(
              await ensureBrowserSession(),
              url,
              detailDelayMs * 2,
              true,
              logger,
              options?.onProgress,
              2,
            );
            detailDiagnostics.push({
              url,
              finalUrl: fallbackResult.finalUrl,
              status: fallbackResult.status,
              title: fallbackResult.title,
              htmlLength: fallbackResult.html.length,
              blocked: fallbackResult.blocked,
              expired: fallbackResult.expired,
              attempt: 2,
            });
            if (fallbackResult.blocked) {
              blockedUrls.push(url);
            } else {
              pages.push({ url, html: fallbackResult.html, isExpired: fallbackResult.expired });
            }
            await sleep(Math.max(250, Math.floor(detailDelayMs / 2)));
            continue;
          } catch (fallbackError) {
            const fallbackMessage =
              fallbackError instanceof Error ? fallbackError.message : 'Unknown browser fallback error';
            detailDiagnostics.push({
              url,
              attempt: 1,
              error: `http:${errorMessage}`,
            });
            detailDiagnostics.push({
              url,
              attempt: 2,
              error: `browser:${fallbackMessage}`,
            });
            logger?.error({ url, error: fallbackMessage }, 'Browser fallback failed for detail page');
            await sleep(Math.max(250, Math.floor(detailDelayMs / 2)));
            continue;
          }
        }

        detailDiagnostics.push({
          url,
          attempt: 1,
          error: errorMessage,
        });
        logger?.error({ url, error }, 'Failed to load detail page');
      }
      await sleep(Math.max(250, Math.floor(detailDelayMs / 2)));
    }

    if (blockedUrls.length) {
      logger?.warn({ count: blockedUrls.length }, 'Blocked job pages detected after all attempts');
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
    await closeBrowserSession(browserSession, logger);
  }
};
