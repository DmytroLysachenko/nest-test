import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parsePracujPl } from './parse';

const readFixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

test('parsePracujPl falls back to NEXT_DATA job offer fields when DOM selectors are sparse', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/platform-engineer,oferta,123',
      html: readFixture('detail-next-data-sparse.html'),
    },
  ]);

  assert.equal(result?.title, 'Platform Engineer');
  assert.equal(result?.company, 'Example Corp');
  assert.equal(result?.location, 'Remote, Poland');
  assert.equal(result?.applyUrl, 'https://it.pracuj.pl/praca/platform-engineer,oferta,123');
  assert.deepEqual(result?.requirements, ['TypeScript', 'Node.js']);
  assert.deepEqual(result?.details?.workModes, ['remote']);
  assert.deepEqual(result?.details?.contractTypes, ['b2b']);
  assert.deepEqual(result?.details?.positionLevels, ['senior']);
});

test('parsePracujPl keeps fallback description instead of crashing on sparse pages', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/frontend-engineer,oferta,456',
      html: readFixture('detail-sparse-fallback.html'),
    },
  ]);

  assert.equal(result?.title, 'Frontend Engineer');
  assert.equal(result?.description, 'No description found');
  assert.equal(result?.applyUrl, 'https://it.pracuj.pl/praca/frontend-engineer,oferta,456');
});

test('parsePracujPl sanitizes noisy company description and extracts workplace metadata', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/data-engineer,oferta,789',
      html: readFixture('detail-company-workplace.html'),
    },
  ]);

  assert.equal(result?.details?.companyDescription, 'Build modern data products for banks.');
  assert.equal(result?.details?.workplace, 'Hybrid');
  assert.equal(result?.details?.companyLocation, 'Warszawa, Prosta 1');
});

test('parsePracujPl extracts validThrough expiry and richer structured sections', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/senior-full-stack-engineer,oferta,999',
      html: readFixture('detail-expiry-rich.html'),
    },
  ]);

  assert.equal(result?.postedAt, '2026-04-01T08:00:00.000Z');
  assert.equal(result?.expiresAt, '2099-04-30T21:59:59Z');
  assert.equal(result?.applyUrl, 'https://pracuj.pl/apply/999');
  assert.equal(result?.sourceCompanyProfileUrl, 'https://pracuj.pl/future-systems');
  assert.deepEqual(result?.requirements, ['TypeScript', 'Node.js', 'AWS']);
  assert.deepEqual(result?.details?.sections?.aboutProject, ['Platform modernization for regulated fintech systems.']);
  assert.deepEqual(result?.details?.sections?.responsibilities, ['Build backend APIs', 'Improve frontend workflows']);
  assert.deepEqual(result?.details?.sections?.offered, ['Flexible working hours', 'Training budget']);
  assert.deepEqual(result?.details?.sections?.additionalInformation, ['Team size: 8 engineers']);
});

test('parsePracujPl preserves critical fields when source section headings drift', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/qa-automation-engineer,oferta,321',
      html: readFixture('detail-drifted-sections.html'),
    },
  ]);

  assert.equal(result?.title, 'QA Automation Engineer');
  assert.equal(result?.company, 'Drift Labs');
  assert.equal(result?.location, 'Gdansk, pomorskie');
  assert.equal(result?.postedAt, '2026-04-05T09:00:00.000Z');
  assert.equal(result?.expiresAt, '2099-05-05T21:59:59Z');
  assert.equal(result?.applyUrl, 'https://pracuj.pl/apply/321');
  assert.equal(result?.sourceCompanyProfileUrl, 'https://pracuj.pl/drift-labs');
  assert.deepEqual(result?.requirements, ['Playwright', 'TypeScript', 'API testing']);
  assert.ok(result?.description);
});

test('parsePracujPl extracts rich rendered Pracuj detail content', () => {
  const [result] = parsePracujPl([
    {
      url: 'https://it.pracuj.pl/praca/junior-frontend-developer-krakow,oferta,1004778768',
      html: readFixture('detail-rendered-rich.html'),
    },
  ]);

  assert.equal(result?.title, 'Junior Frontend Developer');
  assert.equal(result?.company, 'SYNTHETIFY LABS SPOLKA Z OGRANICZONA ODPOWIEDZIALNOSCIA');
  assert.equal(result?.location, 'Krakow, malopolskie');
  assert.match(result?.salary ?? '', /5 500 - 8 000 zl brutto \/ mies/i);
  assert.equal(result?.applyUrl, 'https://pracuj.pl/apply/1004778768');
  assert.equal(result?.sourceCompanyProfileUrl, 'https://pracuj.pl/synthetify-labs');
  assert.deepEqual(result?.details?.technologies?.required, ['TypeScript', 'React.js', 'Tailwind CSS']);
  assert.deepEqual(result?.details?.technologies?.niceToHave, ['Codex', 'Claude Code']);
  assert.deepEqual(result?.details?.positionLevels, ['mlodszy specjalista / mlodsza specjalistka (junior)']);
  assert.deepEqual(result?.details?.workModes, ['praca hybrydowa']);
  assert.deepEqual(result?.details?.contractTypes, ['umowa o prace', 'umowa zlecenie', 'kontrakt B2B']);
  assert.deepEqual(result?.requirements, [
    'Minimum 1 rok doswiadczenia jako Frontend Developer',
    'Bardzo dobra znajomosc TypeScript i React',
  ]);
  assert.deepEqual(result?.details?.sections?.responsibilities, [
    'Rozwoj i utrzymanie aplikacji',
    'Dbanie o jakosc kodu',
  ]);
});
