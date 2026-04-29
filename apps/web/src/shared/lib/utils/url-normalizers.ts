export const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

export const normalizePathWithLeadingSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);

export const buildUrlFromBase = (baseUrl: string, path: string) =>
  `${normalizeBaseUrl(baseUrl)}${normalizePathWithLeadingSlash(path)}`;

export const buildPathWithQuery = (
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  const normalizedPath = normalizePathWithLeadingSlash(path);
  const value = query.toString();

  return value ? `${normalizedPath}?${value}` : normalizedPath;
};
