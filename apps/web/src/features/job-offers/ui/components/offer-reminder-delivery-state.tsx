import { formatDateTime } from '@/shared/lib/utils/date-format';

import type { JobOfferReminderDeliveryDto } from '@/shared/types/api';

type OfferReminderDeliveryStateProps = {
  reminderDelivery: JobOfferReminderDeliveryDto | null | undefined;
  compact?: boolean;
};

const reminderBucketLabel: Record<JobOfferReminderDeliveryDto['bucket'], string> = {
  overdue: 'Overdue',
  today: 'Due today',
  upcoming: 'Upcoming',
  stale: 'Stale',
};

const stateBadgeClass: Record<JobOfferReminderDeliveryDto['state'], string> = {
  pending: 'border-primary/20 bg-primary/5 text-primary',
  delivered: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'border-app-danger-border bg-app-danger-soft text-app-danger',
};

const buildReminderDeliveryCopy = (reminderDelivery: JobOfferReminderDeliveryDto) => {
  const bucketLabel = reminderBucketLabel[reminderDelivery.bucket];

  if (reminderDelivery.state === 'delivered') {
    return {
      badge: `${bucketLabel} emailed`,
      title: `${bucketLabel} reminder digest already went out.`,
      description: reminderDelivery.lastSentAt
        ? `Delivered ${formatDateTime(reminderDelivery.lastSentAt)}.`
        : 'Delivered in the current reminder window.',
    };
  }

  if (reminderDelivery.state === 'failed') {
    return {
      badge: `${bucketLabel} failed`,
      title: `${bucketLabel} reminder email failed in the current window.`,
      description: reminderDelivery.lastError
        ? reminderDelivery.lastAttemptedAt
          ? `${reminderDelivery.lastError} Last attempt ${formatDateTime(reminderDelivery.lastAttemptedAt)}.`
          : reminderDelivery.lastError
        : 'The scheduler attempted delivery but the mail step failed.',
    };
  }

  return {
    badge: `${bucketLabel} pending`,
    title: `${bucketLabel} reminder window is still pending delivery.`,
    description: reminderDelivery.lastAttemptedAt
      ? `No successful digest yet. Last attempt ${formatDateTime(reminderDelivery.lastAttemptedAt)}.`
      : 'No digest has been sent for the current reminder window yet.',
  };
};

export const OfferReminderDeliveryState = ({ reminderDelivery, compact = false }: OfferReminderDeliveryStateProps) => {
  if (!reminderDelivery) {
    return null;
  }

  const copy = buildReminderDeliveryCopy(reminderDelivery);

  if (compact) {
    return <span className={`app-badge ${stateBadgeClass[reminderDelivery.state]}`}>{copy.badge}</span>;
  }

  return (
    <div className="app-muted-panel space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Reminder delivery</p>
        <span className={`app-badge ${stateBadgeClass[reminderDelivery.state]}`}>{copy.badge}</span>
      </div>
      <p className="text-text-strong text-sm font-semibold">{copy.title}</p>
      <p className="text-text-soft text-sm">{copy.description}</p>
    </div>
  );
};
