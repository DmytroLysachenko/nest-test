import { chromium } from 'playwright';

import type { RawPage } from '../types';

export const crawlPracujPl = async (headless: boolean): Promise<RawPage[]> => {
  const browser = await chromium.launch({ headless });

  try {
    const page = await browser.newPage();
    await page.goto('https://www.pracuj.pl', { waitUntil: 'domcontentloaded' });
    const html = await page.content();

    return [
      {
        url: page.url(),
        html,
      },
    ];
  } finally {
    await browser.close();
  }
};
