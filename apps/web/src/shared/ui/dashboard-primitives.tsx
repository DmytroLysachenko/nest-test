import { cn } from '@repo/ui/lib/utils';

import { Card } from '@/shared/ui/card';

import type { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
  trend?: {
    label: string;
    tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  className?: string;
};

type StatusPillProps = {
  value: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
};

type DataTableShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

type HeroHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
};

type StatRowProps = {
  label: string;
  value: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
};

type SemanticTone = 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<SemanticTone, string> = {
  success: 'app-status-success',
  warning: 'app-status-warning',
  danger: 'app-status-danger',
  info: 'app-status-info',
};

const trendToneClasses: Record<Exclude<StatRowProps['tone'], undefined>, string> = {
  ...toneClasses,
  neutral: 'bg-surface-muted text-text-soft',
};

export const SectionHeader = ({ title, subtitle, action, className }: SectionHeaderProps) => (
  <div className={cn('app-page-header flex flex-wrap items-center justify-between gap-3', className)}>
    <div>
      <h1 className="app-title">{title}</h1>
      {subtitle ? <p className="app-subtitle mt-1">{subtitle}</p> : null}
    </div>
    {action ? <div>{action}</div> : null}
  </div>
);

export const HeroHeader = ({ eyebrow, title, subtitle, meta, action, className }: HeroHeaderProps) => (
  <section className={cn('app-hero flex flex-col gap-6 md:flex-row md:items-end md:justify-between', className)}>
    <div className="relative z-10 space-y-3">
      {eyebrow ? (
        <span className="app-badge border-primary/20 bg-primary/10 text-primary rounded-full px-3 py-1">{eyebrow}</span>
      ) : null}
      <div className="space-y-2">
        <h1 className="app-title">{title}</h1>
        {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
    </div>
    {action ? <div className="relative z-10 flex shrink-0 items-center gap-2">{action}</div> : null}
  </section>
);

export const MetricCard = ({ label, value, caption, trend, className }: MetricCardProps) => (
  <div className={cn('app-kpi flex flex-col', className)}>
    <p className="text-text-soft mb-2 text-sm font-medium uppercase tracking-wider">{label}</p>
    <p className="text-text-strong text-3xl font-semibold tracking-[-0.04em] md:text-[2rem]">{value}</p>
    {caption ? <p className="text-text-soft mt-2 text-sm leading-6">{caption}</p> : null}
    {trend ? (
      <div className="mt-auto pt-4">
        <span
          className={cn(
            'border-border mt-1 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium',
            trend.tone ? trendToneClasses[trend.tone] : 'bg-surface-muted text-text-soft',
          )}
        >
          {trend.label}
        </span>
      </div>
    ) : null}
  </div>
);

export const StatusPill = ({ value, tone = 'neutral' }: StatusPillProps) => (
  <span
    className={cn(
      'border-border bg-surface-muted text-text-soft inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
      tone !== 'neutral' && toneClasses[tone],
    )}
  >
    {value}
  </span>
);

export const DataTableShell = ({ title, description, children, className }: DataTableShellProps) => (
  <Card title={title} description={description} className={cn('bg-surface-elevated', className)}>
    <div className="overflow-x-auto">{children}</div>
  </Card>
);

export const StatRow = ({ label, value, tone = 'neutral' }: StatRowProps) => (
  <div className="border-border/70 bg-surface-muted/72 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
    <span className="text-text-soft text-sm">{label}</span>
    {typeof value === 'string' ? <StatusPill value={value} tone={tone} /> : value}
  </div>
);
