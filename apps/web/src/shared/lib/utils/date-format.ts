export const formatDateTime = (value: string | number | Date | null | undefined, fallback = 'n/a') => {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString();
};
