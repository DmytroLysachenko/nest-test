import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { crawlPracujPl } from './crawl';

const startFixtureServer = async (routes: Record<string, { status?: number; html: string }>) => {
  const server = createServer((request, response) => {
    const pathname = request.url ? new URL(request.url, 'http://localhost').pathname : '/';
    const route = routes[pathname];
    if (!route) {
      response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<html><head><title>Not found</title></head><body>missing</body></html>');
      return;
    }

    response.writeHead(route.status ?? 200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(route.html);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve fixture server address');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
};

test('crawlPracujPl fetches listing and detail pages over HTTP', async () => {
  const server = await startFixtureServer({
    '/praca': {
      html: `
        <html>
          <head><title>Listing</title></head>
          <body>
            <section data-test="section-offers">
              <a href="https://www.pracuj.pl/praca/solution-architect-bydgoszcz,oferta,1004677038">Offer</a>
            </section>
            <script id="__NEXT_DATA__" type="application/json">
              {"props":{"pageProps":{"offers":[{"offerUrl":"https://www.pracuj.pl/praca/solution-architect-bydgoszcz,oferta,1004677038"}]}}}
            </script>
          </body>
        </html>
      `,
    },
    '/praca/solution-architect-bydgoszcz,oferta,1004677038': {
      html: `
        <html>
          <head><title>Solution Architect</title></head>
          <body>
            <h1 data-test="text-positionName">Solution Architect</h1>
            <h2 data-test="text-employerName">Atos Poland Global Services Sp. z o.o.</h2>
            <script id="__NEXT_DATA__" type="application/json">
              {"props":{"pageProps":{"offer":{"positionName":"Solution Architect"}}}}
            </script>
          </body>
        </html>
      `,
    },
  });

  try {
    const result = await crawlPracujPl(true, `${server.baseUrl}/praca`, 10, undefined, {
      detailHost: server.baseUrl,
    });

    assert.deepEqual(result.jobLinks, [`${server.baseUrl}/praca/solution-architect-bydgoszcz,oferta,1004677038`]);
    assert.equal(result.pages.length, 1);
    assert.equal(result.blockedUrls.length, 0);
    assert.match(result.pages[0]?.html ?? '', /Solution Architect/);
    assert.equal(result.detailDiagnostics.length, 1);
    assert.equal(result.detailDiagnostics[0]?.blocked, false);
  } finally {
    await server.close();
  }
});

test('crawlPracujPl can derive offer links from NEXT_DATA when DOM links are absent', async () => {
  const server = await startFixtureServer({
    '/praca': {
      html: `
        <html>
          <head><title>Listing only next data</title></head>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              {"props":{"pageProps":{"jobs":[{"offerAbsoluteUri":"https://www.pracuj.pl/praca/data-analyst,oferta,1004659505","jobTitle":"Data Analyst"}]}}}
            </script>
          </body>
        </html>
      `,
    },
    '/praca/data-analyst,oferta,1004659505': {
      html: `
        <html>
          <head><title>Data Analyst</title></head>
          <body>
            <h1>Data Analyst</h1>
          </body>
        </html>
      `,
    },
  });

  try {
    const expectedUrl = `${server.baseUrl}/praca/data-analyst,oferta,1004659505`;
    const result = await crawlPracujPl(true, `${server.baseUrl}/praca`, 10, undefined, {
      detailHost: server.baseUrl,
    });

    assert.deepEqual(result.jobLinks, [expectedUrl]);
    assert.equal(result.pages.length, 1);
    assert.equal(result.listingSummaries.length, 1);
  } finally {
    await server.close();
  }
});

test('crawlPracujPl reports zero-results and blocked detail pages correctly', async () => {
  const server = await startFixtureServer({
    '/empty': {
      html: `
        <html>
          <body>
            <section data-test="zero-offers-section"><p>Brak ofert</p></section>
          </body>
        </html>
      `,
    },
    '/blocked': {
      html: `
        <html>
          <body>
            <section data-test="section-offers">
              <a href="https://www.pracuj.pl/praca/blocked,oferta,1001">Blocked</a>
            </section>
          </body>
        </html>
      `,
    },
    '/praca/blocked,oferta,1001': {
      html: `
        <html>
          <head><title>Just a moment...</title></head>
          <body>cf_chl</body>
        </html>
      `,
    },
  });

  try {
    const blockedUrl = `${server.baseUrl}/praca/blocked,oferta,1001`;

    const emptyResult = await crawlPracujPl(true, `${server.baseUrl}/empty`, 10);
    assert.equal(emptyResult.hasZeroOffers, true);
    assert.equal(emptyResult.jobLinks.length, 0);

    const blockedResult = await crawlPracujPl(true, `${server.baseUrl}/blocked`, 10, undefined, {
      detailHost: server.baseUrl,
    });
    assert.equal(blockedResult.jobLinks.length, 1);
    assert.equal(blockedResult.pages.length, 0);
    assert.equal(blockedResult.detailDiagnostics.length, 2);
    assert.equal(blockedResult.detailDiagnostics[0]?.blocked, true);
    assert.ok(
      blockedResult.blockedUrls.includes(blockedUrl) ||
        blockedResult.detailDiagnostics.some(
          (entry) => entry.url === blockedUrl && (entry.blocked || Boolean(entry.error)),
        ),
    );
  } finally {
    await server.close();
  }
});

test('crawlPracujPl respects detail budget and reports stop reason', async () => {
  const server = await startFixtureServer({
    '/praca': {
      html: `
        <html>
          <body>
            <section data-test="section-offers">
              <a href="https://www.pracuj.pl/praca/offer-a,oferta,1001">A</a>
              <a href="https://www.pracuj.pl/praca/offer-b,oferta,1002">B</a>
              <a href="https://www.pracuj.pl/praca/offer-c,oferta,1003">C</a>
            </section>
          </body>
        </html>
      `,
    },
    '/praca/offer-a,oferta,1001': { html: '<html><body><h1>A</h1></body></html>' },
    '/praca/offer-b,oferta,1002': { html: '<html><body><h1>B</h1></body></html>' },
    '/praca/offer-c,oferta,1003': { html: '<html><body><h1>C</h1></body></html>' },
  });

  try {
    const result = await crawlPracujPl(true, `${server.baseUrl}/praca`, 10, undefined, {
      detailHost: server.baseUrl,
      detailBudget: 2,
    });

    assert.equal(result.jobLinks.length, 3);
    assert.equal(result.detailAttemptedCount, 2);
    assert.equal(result.detailBudget, 2);
    assert.equal(result.detailStopReason, 'budget_reached');
    assert.equal(result.pages.length, 2);
  } finally {
    await server.close();
  }
});

test('crawlPracujPl prioritizes richer listing summaries when detail budget is limited', async () => {
  const server = await startFixtureServer({
    '/praca': {
      html: `
        <html>
          <body>
            <section data-test="section-offers">
              <a href="https://www.pracuj.pl/praca/lean-offer,oferta,1001">Lean</a>
              <a href="https://www.pracuj.pl/praca/rich-offer,oferta,1002">Rich</a>
            </section>
            <script id="__NEXT_DATA__" type="application/json">
              {"props":{"pageProps":{"cards":[
                {"offerUrl":"https://www.pracuj.pl/praca/lean-offer,oferta,1001","jobTitle":"Lean","company":"A"},
                {"offerUrl":"https://www.pracuj.pl/praca/rich-offer,oferta,1002","jobTitle":"Rich","company":"B","salaryDisplayText":"20k","jobDescription":"Detailed summary","isRemoteWorkAllowed":true,"technologies":["TypeScript","React"],"workModes":["remote"]}
              ]}}}
            </script>
          </body>
        </html>
      `,
    },
    '/praca/lean-offer,oferta,1001': { html: '<html><body><h1>Lean</h1></body></html>' },
    '/praca/rich-offer,oferta,1002': { html: '<html><body><h1>Rich</h1></body></html>' },
  });

  try {
    const result = await crawlPracujPl(true, `${server.baseUrl}/praca`, 10, undefined, {
      detailHost: server.baseUrl,
      detailBudget: 1,
    });

    assert.equal(result.pages.length, 1);
    assert.match(result.pages[0]?.html ?? '', /Rich/);
    assert.equal(result.detailAttemptedCount, 1);
  } finally {
    await server.close();
  }
});

test('crawlPracujPl aborts in-flight detail fetches when the scrape signal is cancelled', async () => {
  const server = await startFixtureServer({
    '/praca': {
      html: `
        <html>
          <body>
            <section data-test="section-offers">
              <a href="https://www.pracuj.pl/praca/slow-offer,oferta,1001">Slow</a>
            </section>
          </body>
        </html>
      `,
    },
    '/praca/slow-offer,oferta,1001': {
      html: '<html><body><h1>Slow</h1></body></html>',
    },
  });

  const controller = new AbortController();
  const delayedServer = createServer((request, response) => {
    const pathname = request.url ? new URL(request.url, 'http://localhost').pathname : '/';
    if (pathname === '/praca/slow-offer,oferta,1001') {
      setTimeout(() => {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end('<html><body><h1>Slow</h1></body></html>');
      }, 5_000);
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`
      <html>
        <body>
          <section data-test="section-offers">
            <a href="https://www.pracuj.pl/praca/slow-offer,oferta,1001">Slow</a>
          </section>
        </body>
      </html>
    `);
  });

  await new Promise<void>((resolve) => delayedServer.listen(0, '127.0.0.1', () => resolve()));
  const address = delayedServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve delayed server address');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const crawlPromise = crawlPracujPl(true, `${baseUrl}/praca`, 10, undefined, {
    detailHost: baseUrl,
    abortSignal: controller.signal,
  });

  setTimeout(() => controller.abort(), 50);

  try {
    await assert.rejects(crawlPromise, (error: unknown) => {
      assert.equal(error instanceof Error ? error.name : undefined, 'AbortError');
      return true;
    });
  } finally {
    await new Promise<void>((resolve, reject) => delayedServer.close((error) => (error ? reject(error) : resolve())));
    await server.close();
  }
});
