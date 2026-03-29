import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePracujPl } from './parse';

test('parsePracujPl falls back to NEXT_DATA job offer fields when DOM selectors are sparse', () => {
  const html = `
    <html>
      <head>
        <script id="__NEXT_DATA__" type="application/json">
          ${JSON.stringify({
            props: {
              pageProps: {
                dehydratedState: {
                  queries: [
                    {
                      queryKey: ['jobOffer', '123'],
                      state: {
                        data: {
                          jobTitle: 'Platform Engineer',
                          employerName: 'Example Corp',
                          region: 'Remote, Poland',
                          requirements: ['TypeScript', 'Node.js'],
                          workModes: ['remote'],
                          employmentTypes: ['b2b'],
                          positionLevels: ['senior'],
                        },
                      },
                    },
                  ],
                },
              },
            },
          })}
        </script>
      </head>
      <body>
        <main><div>minimal page shell</div></main>
      </body>
    </html>
  `;

  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/platform-engineer,oferta,123',
      html,
    },
  ]);

  assert.equal(result?.title, 'Platform Engineer');
  assert.equal(result?.company, 'Example Corp');
  assert.equal(result?.location, 'Remote, Poland');
  assert.deepEqual(result?.requirements, ['TypeScript', 'Node.js']);
  assert.deepEqual(result?.details?.workModes, ['remote']);
  assert.deepEqual(result?.details?.contractTypes, ['b2b']);
  assert.deepEqual(result?.details?.positionLevels, ['senior']);
});

test('parsePracujPl keeps fallback description instead of crashing on sparse pages', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/frontend-engineer,oferta,456',
      html: '<html><body><h1>Frontend Engineer</h1></body></html>',
    },
  ]);

  assert.equal(result?.title, 'Frontend Engineer');
  assert.equal(result?.description, 'No description found');
});
