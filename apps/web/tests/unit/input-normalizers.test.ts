import {
  toNormalizedCsvValues,
  toNormalizedStringArray,
  toOptionalTrimmedString,
  toTrimmedString,
} from '@/shared/lib/utils/input-normalizers';
import {
  buildPathWithQuery,
  buildUrlFromBase,
  normalizeBaseUrl,
  normalizePathWithLeadingSlash,
} from '@/shared/lib/utils/url-normalizers';

describe('input normalizers', () => {
  it('returns undefined for empty optional strings', () => {
    expect(toOptionalTrimmedString('  ')).toBeUndefined();
    expect(toOptionalTrimmedString(' value ')).toBe('value');
  });

  it('normalizes csv values and string arrays', () => {
    expect(toNormalizedCsvValues('react, typescript, , node ')).toEqual(['react', 'typescript', 'node']);
    expect(toNormalizedStringArray(['a', undefined, 'b'])).toEqual(['a', 'b']);
    expect(toTrimmedString('  hello  ')).toBe('hello');
  });
});

describe('url normalizers', () => {
  it('normalizes base urls and leading slashes', () => {
    expect(normalizeBaseUrl('https://api.example.com///')).toBe('https://api.example.com');
    expect(normalizePathWithLeadingSlash('health')).toBe('/health');
    expect(buildUrlFromBase('https://api.example.com/', 'health')).toBe('https://api.example.com/health');
    expect(buildPathWithQuery('/companies', { location: 'Warsaw', page: 2, empty: '' })).toBe(
      '/companies?location=Warsaw&page=2',
    );
  });
});
