import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppToaster } from '@/shared/ui/toaster';

const toasterSpy = vi.fn<(props: Record<string, unknown>) => null>(() => null);

vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    toasterSpy(props);
    return null;
  },
}));

describe('AppToaster', () => {
  it('passes lighter shared toast styling into sonner', () => {
    render(<AppToaster />);

    const props = toasterSpy.mock.calls[0]?.[0] as unknown as {
      position: string;
      toastOptions: {
        duration: number;
        classNames: Record<string, string>;
      };
    };

    expect(props.position).toBe('top-right');
    expect(props.toastOptions.duration).toBe(3500);
    expect(props.toastOptions.classNames.toast).toContain('bg-surface-elevated');
    expect(props.toastOptions.classNames.actionButton).toContain('rounded-full');
    expect(props.toastOptions.classNames.cancelButton).toContain('bg-transparent');
  });
});
