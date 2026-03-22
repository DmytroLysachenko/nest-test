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
