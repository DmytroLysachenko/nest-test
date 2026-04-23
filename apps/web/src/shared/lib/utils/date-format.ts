const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

const statusTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

const toDate = (value: string | number | Date | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value: string | number | Date | null | undefined, fallback = 'n/a') => {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
};

export const formatDate = (value: string | number | Date | null | undefined, fallback = 'n/a') => {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : fallback;
};

export const formatStatusTimestamp = (value: string | number | Date | null | undefined, fallback = 'n/a') => {
  const date = toDate(value);
  return date ? statusTimestampFormatter.format(date) : fallback;
};

export const formatRelativeTime = (value: string | number | Date | null | undefined, fallback = 'n/a') => {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }

  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeFormatter.format(diffDays, 'day');
};
