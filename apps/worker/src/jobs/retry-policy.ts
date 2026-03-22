export const computeRetryDelayMs = (attempt: number, baseDelayMs: number, maxDelayMs: number) => {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(maxDelayMs, baseDelayMs * 2 ** exponent);
};
