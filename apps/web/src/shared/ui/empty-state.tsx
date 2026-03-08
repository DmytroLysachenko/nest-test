import { cn } from '@repo/ui/lib/utils';

import { Button } from '@/shared/ui/button';

import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
};

export const EmptyState = ({ title, description, actionLabel, onAction, icon, className }: EmptyStateProps) => (
  <div
    className={cn(
      'border-border/80 bg-surface-muted/30 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed p-8 text-center sm:p-12',
      className,
    )}
  >
    {icon ? (
      <div className="text-muted-foreground/50 bg-surface-elevated/50 mb-5 flex h-16 w-16 items-center justify-center rounded-full shadow-sm">
        {icon}
      </div>
    ) : null}
    <h3 className="text-text-strong text-lg font-semibold tracking-tight">{title}</h3>
    <p className="text-text-soft mt-2 max-w-sm text-sm leading-6">{description}</p>
    {actionLabel && onAction ? (
      <Button type="button" variant="secondary" onClick={onAction} className="mt-6">
        {actionLabel}
      </Button>
    ) : null}
  </div>
);
