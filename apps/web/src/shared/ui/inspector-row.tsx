import { cn } from '@repo/ui/lib/utils';

import type { ReactNode } from 'react';

type InspectorRowProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
};

export const InspectorRow = ({ label, value, hint, className }: InspectorRowProps) => (
  <div
    className={cn(
      'rounded-2xl border border-border/70 bg-surface-elevated/88 px-4 py-3',
      'flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4',
      className,
    )}
  >
    <div className="min-w-0">
      <p className="text-text-soft text-xs uppercase tracking-[0.12em]">{label}</p>
      {hint ? <p className="text-text-soft mt-1 text-xs leading-5">{hint}</p> : null}
    </div>
    <div className="text-text-strong min-w-0 text-sm font-medium md:max-w-[60%] md:text-right">{value}</div>
  </div>
);
