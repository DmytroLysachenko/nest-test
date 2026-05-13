import { describe, expect, it } from 'vitest';

import { getOfferSurfaceLocationLine, getSafeOfferField } from '@/shared/lib/presentation/job-search-ui';

describe('job-search-ui sanitation helpers', () => {
  it('keeps normal location and salary text intact', () => {
    expect(getSafeOfferField('Gdansk, Pomorskie', 'location')).toBe('Gdansk, Pomorskie');
    expect(getSafeOfferField('18 000 - 22 000 PLN', 'salary')).toBe('18 000 - 22 000 PLN');
    expect(
      getOfferSurfaceLocationLine({
        location: 'Remote',
        salary: '18 000 - 22 000 PLN',
        fallbackLocation: 'Location not specified',
      }),
    ).toBe('Remote | 18 000 - 22 000 PLN');
  });

  it('drops suspicious scraped salary pollution', () => {
    expect(
      getSafeOfferField(
        '130-173 zl Gdansk Superoferta Wlacz powiadomienie Podobne oferty Senior Software Engineer',
        'salary',
      ),
    ).toBeNull();
  });

  it('drops suspicious location pollution and falls back cleanly', () => {
    expect(getSafeOfferField('Gdansk Superoferta Podobne oferty', 'location')).toBeNull();
    expect(
      getOfferSurfaceLocationLine({
        location: 'Gdansk Superoferta Podobne oferty',
        salary: '18 000 - 22 000 PLN',
        fallbackLocation: 'Location not specified',
      }),
    ).toBe('Location not specified | 18 000 - 22 000 PLN');
  });

  it('drops overly long salary blobs even without known markers', () => {
    expect(
      getSafeOfferField(
        '18 000 - 22 000 PLN brutto umowa o prace senior engineer react typescript gdansk remote hybrid extra duplicated noisy words more filler text',
        'salary',
      ),
    ).toBeNull();
  });
});
