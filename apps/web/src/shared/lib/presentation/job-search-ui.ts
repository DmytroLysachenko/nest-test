import type { JobSourceRunDto, ScrapeScheduleEventDto } from '@/shared/types/api';

const SUSPICIOUS_OFFER_TEXT_MARKERS = [
  'superoferta',
  'podobne oferty',
  'włącz powiadomienie',
  'wlacz powiadomienie',
  'powiadomienie',
  'sprawdź ofertę',
  'sprawdz oferte',
];

export const formatCountLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export const getUserFacingRunStatus = (status: string | null | undefined) => {
  switch (status) {
    case 'COMPLETED':
      return 'Updated';
    case 'FAILED':
      return 'Needs attention';
    case 'RUNNING':
      return 'Updating now';
    case 'PENDING':
      return 'Queued';
    default:
      return 'Not started';
  }
};

export const getAutomationModeLabel = (enabled: boolean | null | undefined) =>
  enabled ? 'Automatic updates on' : 'Manual updates';

export const getAutomationPresetSummary = (cron: string | null | undefined, enabled: boolean | null | undefined) => {
  if (!enabled) {
    return 'Run updates when you want';
  }
  return getSchedulePresetLabel(cron);
};

export const getAutomationLastUpdateSummary = (status: string | null | undefined) => {
  if (!status) {
    return 'No updates yet';
  }
  return getUserFacingRunStatus(status);
};

export const getUserFacingOfferStatus = (status: string) => {
  switch (status) {
    case 'NEW':
      return 'New';
    case 'SEEN':
      return 'Reviewed';
    case 'SAVED':
      return 'Saved';
    case 'APPLIED':
      return 'Applied';
    case 'INTERVIEWING':
      return 'Interviewing';
    case 'OFFER':
      return 'Offer';
    case 'REJECTED':
      return 'Closed';
    case 'ARCHIVED':
      return 'Archived';
    case 'DISMISSED':
      return 'Dismissed';
    default:
      return status;
  }
};

export const getSchedulePresetLabel = (cron: string | null | undefined) => {
  switch (cron) {
    case '0 8 * * 1-5':
      return 'Weekdays at 08:00';
    case '0 18 * * *':
      return 'Every day at 18:00';
    case '0 9 * * *':
      return 'Every day at 09:00';
    default:
      return cron ?? 'Custom schedule';
  }
};

export const getScheduleEventPresentation = (event: ScrapeScheduleEventDto) => {
  switch (event.eventType) {
    case 'schedule_updated':
      return {
        label: 'Schedule updated',
        summary: 'Your automation preferences were saved.',
      };
    case 'schedule_trigger_received':
      return {
        label: 'Update window started',
        summary: 'The scheduled refresh window has started.',
      };
    case 'schedule_enqueue_started':
      return {
        label: 'Preparing update',
        summary: 'The next automatic search refresh is being prepared.',
      };
    case 'schedule_enqueue_succeeded':
      return {
        label: 'Update started',
        summary: 'Your automatic search refresh started successfully.',
      };
    case 'schedule_enqueue_failed':
      return {
        label: 'Update needs attention',
        summary: event.message || 'The automatic refresh did not start this time.',
      };
    default:
      return {
        label: 'Automation activity',
        summary: event.message,
      };
  }
};

export const getRunMatchingPresentation = (run: JobSourceRunDto) => {
  if (run.matchingState === 'deferred') {
    return {
      tone: 'warning' as const,
      label: 'Catalog saved, workflow rebuild needed',
      summary: 'Offers were persisted, but notebook linking was deferred. Use rebuild if opportunities stayed empty.',
    };
  }

  if (run.matchingState === 'pending') {
    return {
      tone: 'warning' as const,
      label: 'Catalog saved, linking still running',
      summary: 'Shared catalog rows are there. Matching is still finishing before notebook visibility settles.',
    };
  }

  if (run.matchingState === 'completed' && (run.linkedNotebookOffers ?? 0) > 0) {
    return {
      tone: 'positive' as const,
      label: 'Opportunities delivered',
      summary: `${run.linkedNotebookOffers} linked to your workflow from ${run.matchedOffers ?? 0} matched candidates.`,
    };
  }

  if (run.matchingState === 'completed') {
    return {
      tone: 'neutral' as const,
      label: 'No new opportunities linked',
      summary: 'The run finalized cleanly, but nothing new was inserted into your workflow.',
    };
  }

  if (run.matchingState === 'skipped') {
    return {
      tone: 'warning' as const,
      label: 'Linking skipped',
      summary: 'The scrape finished, but user/profile context was missing for notebook delivery.',
    };
  }

  return {
    tone: 'neutral' as const,
    label: 'Linking state unavailable',
    summary: 'Use the run status and schedule evidence as the current trust signals.',
  };
};

const normalizeOfferSurfaceText = (value: string | null | undefined) => {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed : null;
};

const containsSuspiciousOfferTextMarker = (value: string) => {
  const normalized = value.toLowerCase();
  return SUSPICIOUS_OFFER_TEXT_MARKERS.some((marker) => normalized.includes(marker));
};

export const getSafeOfferField = (value: string | null | undefined, field: 'salary' | 'location'): string | null => {
  const normalized = normalizeOfferSurfaceText(value);
  if (!normalized) {
    return null;
  }

  if (containsSuspiciousOfferTextMarker(normalized)) {
    return null;
  }

  if (field === 'salary' && normalized.length > 120) {
    return null;
  }

  if (field === 'location' && normalized.length > 80) {
    return null;
  }

  return normalized;
};

export const getOfferSurfaceLocationLine = (input: {
  location?: string | null;
  salary?: string | null;
  fallbackLocation?: string;
}) => {
  const safeLocation =
    getSafeOfferField(input.location, 'location') ?? input.fallbackLocation ?? 'Location not specified';
  const safeSalary = getSafeOfferField(input.salary, 'salary');
  return safeSalary ? `${safeLocation} | ${safeSalary}` : safeLocation;
};
