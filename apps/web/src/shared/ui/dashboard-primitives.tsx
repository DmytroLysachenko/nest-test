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
    tone?: 'success' | 'warning' | 'danger' | 'info';
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

type SemanticTone = 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<SemanticTone, string> = {
  success: 'app-status-success',
  warning: 'app-status-warning',
  danger: 'app-status-danger',
  info: 'app-status-info',
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

export const MetricCard = ({ label, value, caption, trend, className }: MetricCardProps) => (
  <Card title={label} className={cn('bg-surface-elevated border-border/80 rounded-2xl', className)}>
    <p className="text-text-strong text-3xl font-semibold tracking-tight">{value}</p>
    {caption ? <p className="text-text-soft mt-1 text-sm">{caption}</p> : null}
    {trend ? (
      <span
        className={cn(
          'border-border mt-3 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium',
          trend.tone ? toneClasses[trend.tone] : 'bg-surface-muted text-text-soft',
        )}
      >
        {trend.label}
      </span>
    ) : null}
  </Card>
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
