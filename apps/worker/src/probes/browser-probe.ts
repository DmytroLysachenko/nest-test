import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import type { Logger } from 'pino';

chromium.use(stealth());

const BROWSER_PROBE_TIMEOUT_MS = 45_000;

export const runBrowserProbe = async (logger?: Logger) => {
  const startedAt = Date.now();
  const browser = await chromium.launch({
    channel: 'chromium',
    headless: true,
    timeout: BROWSER_PROBE_TIMEOUT_MS,
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const navigationStartedAt = Date.now();

    await page.goto('data:text/html,<html><body><h1>browser-probe</h1></body></html>', {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_PROBE_TIMEOUT_MS,
    });

    const title = await page.locator('h1').textContent();
    await page.close();
    await context.close();

    const result = {
      channel: 'chromium',
      timeoutMs: BROWSER_PROBE_TIMEOUT_MS,
      title: title ?? null,
      launchDurationMs: Date.now() - startedAt,
      navigationDurationMs: Date.now() - navigationStartedAt,
    };

    logger?.debug(result, 'Worker browser probe succeeded');
    return result;
  } finally {
    await browser.close().catch(() => undefined);
  }
};

if (require.main === module) {
  runBrowserProbe()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
      process.exitCode = 1;
    });
}
