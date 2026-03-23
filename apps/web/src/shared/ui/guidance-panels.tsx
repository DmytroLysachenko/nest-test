import { cn } from '@repo/ui/lib/utils';

import { Button } from '@/shared/ui/button';

import type { ReactNode } from 'react';

type GuidancePanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: 'info' | 'success' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
};

type JourneyStepsProps = {
  title: string;
  description?: string;
  steps: Array<{
    key: string;
    title: string;
    description: string;
    status?: 'done' | 'active' | 'upcoming';
  }>;
  className?: string;
};

const toneClasses = {
  info: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_10%,white),color-mix(in_oklab,var(--surface-elevated)_72%,transparent)_62%)]',
  success:
    'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--app-success)_12%,white),color-mix(in_oklab,var(--surface-elevated)_72%,transparent)_62%)]',
  warning:
    'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--app-warning)_12%,white),color-mix(in_oklab,var(--surface-elevated)_72%,transparent)_62%)]',
};

const statusClasses = {
  done: 'bg-app-success text-white',
  active: 'bg-primary text-primary-foreground',
  upcoming: 'bg-surface-muted text-text-soft',
};

export const GuidancePanel = ({
  eyebrow,
  title,
  description,
  tone = 'info',
  actionLabel,
  onAction,
  className,
  children,
}: GuidancePanelProps) => (
  <section
    className={cn(
      'rounded-[1.8rem] p-5 shadow-[0_20px_60px_-34px_color-mix(in_oklab,var(--text-strong)_18%,transparent)] md:p-6',
      toneClasses[tone],
      className,
    )}
  >
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-text-soft text-[11px] font-semibold uppercase tracking-[0.18em]">{eyebrow}</p>
        ) : null}
        <div className="space-y-1.5">
          <h2 className="text-text-strong text-xl font-semibold tracking-[-0.03em]">{title}</h2>
          <p className="text-text-soft max-w-3xl text-sm leading-6">{description}</p>
        </div>
      </div>
      {actionLabel && onAction ? (
        <Button type="button" variant="secondary" className="shrink-0" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
    {children ? <div className="mt-4">{children}</div> : null}
  </section>
);

export const JourneySteps = ({ title, description, steps, className }: JourneyStepsProps) => (
  <section className={cn('app-surface-elevated p-5 md:p-6', className)}>
    <div className="mb-4 space-y-1.5">
      <h2 className="text-text-strong text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      {description ? <p className="text-text-soft text-sm leading-6">{description}</p> : null}
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => (
        <div key={step.key} className="bg-surface-muted/72 rounded-[1.45rem] p-4">
          <div className="mb-3 flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold',
                statusClasses[step.status ?? 'upcoming'],
              )}
            >
              {index + 1}
            </span>
            <span className="text-text-strong text-sm font-semibold">{step.title}</span>
          </div>
          <p className="text-text-soft text-sm leading-6">{step.description}</p>
        </div>
      ))}
    </div>
  </section>
);
