export const toOptionalTrimmedString = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
};

export const toTrimmedString = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

export const toNormalizedStringArray = <T extends string>(values: Array<T | undefined> | undefined): T[] =>
  (values ?? []).filter((value): value is T => typeof value === 'string');

export const toNormalizedCsvValues = (value: string | null | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
