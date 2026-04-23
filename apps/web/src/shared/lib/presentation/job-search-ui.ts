import type { ScrapeScheduleEventDto } from '@/shared/types/api';

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
        label: 'Update queued',
        summary: 'A scheduled search refresh was queued successfully.',
      };
    case 'schedule_enqueue_failed':
      return {
        label: 'Update missed',
        summary: event.message,
      };
    default:
      return {
        label: 'Automation activity',
        summary: event.message,
      };
  }
};
