import React from 'react';
import { cn } from '@repo/ui/lib/utils';

import { Button } from '@/shared/ui/button';

import type { ReactNode } from 'react';

type WorkflowFeedbackProps = {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

type WorkflowInlineNoticeProps = {
  title: string;
  description: string;
  tone?: 'info' | 'warning' | 'danger' | 'success';
  className?: string;
};

const toneStyles: Record<NonNullable<WorkflowFeedbackProps['tone']>, string> = {
  info: 'border-primary/20 bg-primary/5 text-primary',
  warning: 'border-app-warning-border bg-app-warning-soft text-app-warning',
  danger: 'border-app-danger-border bg-app-danger-soft text-app-danger',
  success: 'border-app-success-border bg-app-success-soft text-app-success',
};

const iconToneStyles: Record<NonNullable<WorkflowFeedbackProps['tone']>, string> = {
  info: 'bg-primary/10 text-primary',
  warning: 'bg-app-warning-soft text-app-warning',
  danger: 'bg-app-danger-soft text-app-danger',
  success: 'bg-app-success-soft text-app-success',
};

export const WorkflowFeedback = ({
  eyebrow,
  title,
  description,
  tone = 'info',
  icon,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className,
}: WorkflowFeedbackProps) => (
  <section className={cn('rounded-[1.5rem] border p-5 sm:p-6', toneStyles[tone], className)}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        {icon ? (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', iconToneStyles[tone])}>
            {icon}
          </div>
        ) : null}
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{eyebrow}</p>
          ) : null}
          <div className="space-y-1.5">
            <h3 className="text-text-strong text-lg font-semibold tracking-[-0.02em]">{title}</h3>
            <p className="text-text-soft max-w-2xl text-sm leading-6">{description}</p>
          </div>
        </div>
      </div>
      {(actionLabel && onAction) || (secondaryLabel && onSecondaryAction) ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {secondaryLabel && onSecondaryAction ? (
            <Button type="button" variant="secondary" className="h-9" onClick={onSecondaryAction}>
              {secondaryLabel}
            </Button>
          ) : null}
          {actionLabel && onAction ? (
            <Button type="button" className="h-9" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  </section>
);

export const WorkflowInlineNotice = ({ title, description, tone = 'info', className }: WorkflowInlineNoticeProps) => (
  <div className={cn('rounded-[1.2rem] border px-4 py-3', toneStyles[tone], className)}>
    <p className="text-text-strong text-sm font-semibold">{title}</p>
    <p className="text-text-soft mt-1 text-sm leading-6">{description}</p>
  </div>
);
