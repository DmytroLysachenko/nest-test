import { createElement } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const TOAST_UNDO_ARIA_LABEL = 'Undo last change';

export const toastSuccess = (message: string) => {
  toast.success(message);
};

export const toastSuccessWithAction = (message: string, actionLabel: string, onAction: () => void) => {
  toast.custom((toastId) =>
    createElement(
      'div',
      {
        className:
          'border-border/60 bg-surface-elevated flex w-full items-center justify-between gap-4 rounded-[1.2rem] border px-4 py-3 shadow-[0_18px_42px_-28px_color-mix(in_oklab,var(--text-strong)_20%,transparent)]',
      },
      createElement(
        'div',
        { className: 'min-w-0' },
        createElement('p', { className: 'text-text-strong text-sm font-medium' }, message),
        createElement(
          'p',
          { className: 'text-text-soft mt-1 text-xs' },
          'Use undo if this status change should be reverted immediately.',
        ),
      ),
      createElement(
        'button',
        {
          type: 'button',
          'aria-label': TOAST_UNDO_ARIA_LABEL,
          className:
            'border-border/60 bg-surface-muted hover:bg-surface-muted/80 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors',
          onClick: () => {
            onAction();
            toast.dismiss(toastId);
          },
        },
        createElement(RotateCcw, { className: 'h-4 w-4' }),
        createElement('span', { className: 'sr-only' }, actionLabel),
      ),
    ),
  );
};

export const toastError = (message: string) => {
  toast.error(message);
};

export const toastInfo = (message: string) => {
  toast(message);
};
