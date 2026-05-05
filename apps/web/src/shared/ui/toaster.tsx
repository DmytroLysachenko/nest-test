'use client';

import { Toaster } from 'sonner';

export const AppToaster = () => (
  <Toaster
    richColors
    position="top-right"
    toastOptions={{
      duration: 3500,
      classNames: {
        toast:
          'border-border/60 bg-surface-elevated text-text-strong rounded-[1.35rem] border shadow-[0_18px_42px_-28px_color-mix(in_oklab,var(--text-strong)_18%,transparent)]',
        title: 'text-text-strong text-sm font-medium',
        description: 'text-text-soft text-xs',
        actionButton:
          'border-border/60 bg-surface-muted text-text-strong hover:bg-surface-muted/80 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
        cancelButton:
          'border-border/60 bg-transparent text-text-soft hover:bg-surface-muted/60 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
      },
    }}
  />
);
